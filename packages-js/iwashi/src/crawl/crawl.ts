import { HttpClient } from './http-client.js';
import { ProfileUrl } from './profile-url.js';
import { ProfileNode } from './site-profile.js';
import type { SiteVisitor } from './site-visitor.js';

export class Crawl {
    private readonly visitedUrls = new Set<string>();
    private readonly visitedIds = new Set<string>();
    private readonly pending: Promise<void>[] = [];

    public constructor(
        private readonly visitors: readonly SiteVisitor[],
        private readonly http: HttpClient = new HttpClient(),
    ) {}

    public async tree(url: string): Promise<ProfileNode | undefined> {
        const root = await this.visit(url);
        while (this.pending.length > 0) {
            await this.pending.shift();
        }
        return root;
    }

    private async visit(url: string): Promise<ProfileNode | undefined> {
        const normalized = ProfileUrl.normalize(url);
        if (!normalized || this.visitedUrls.has(normalized)) return;
        this.visitedUrls.add(normalized);
        for (const visitor of this.visitors) {
            if (!visitor.matches(normalized)) continue;
            try {
                const id = await visitor.resolveId(normalized, this.http);
                if (!id) continue;
                const key = `${visitor.name}:${id}`;
                if (this.visitedIds.has(key)) return;
                this.visitedIds.add(key);
                await visitor.throttle.wait();
                const profile = await visitor.visit(id, this.http);
                if (!profile) return;
                const node = new ProfileNode(profile);
                for (const link of profile.links) {
                    this.schedule(link, node);
                }
                return node;
            } catch (error) {
                console.warn(`[Iwashi] ${visitor.name} failed to visit ${normalized}`, error);
            }
        }
        return this.followRedirect(normalized);
    }

    private schedule(url: string, parent: ProfileNode): void {
        this.pending.push(this.visit(url).then((child) => {
            if (child) parent.children.push(child);
        }));
    }

    private async followRedirect(url: string): Promise<ProfileNode | undefined> {
        let response: Response;
        try {
            response = await this.http.ok(url, {
                headers: { 'User-Agent': HttpClient.BROWSER_USER_AGENT, 'Referer': url },
                timeoutMs: 5000,
            });
        } catch (error) {
            console.warn(`[Iwashi] failed to redirect ${url}`, error);
            return;
        }
        if (response.url === url) {
            console.warn(`[Iwashi] no visitor matched ${url}`);
            return;
        }
        return this.visit(response.url);
    }
}
