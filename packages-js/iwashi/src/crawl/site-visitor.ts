import type { HttpClient } from './http-client.js';
import type { SiteProfile } from './site-profile.js';
import { Throttle } from './throttle.js';

export interface SiteVisitor {
    readonly name: string;
    readonly throttle: Throttle;
    matches(url: string): boolean;
    resolveId(url: string, http: HttpClient): Promise<string | undefined>;
    visit(id: string, http: HttpClient): Promise<SiteProfile | undefined>;
}

export abstract class PatternVisitor implements SiteVisitor {
    public static readonly HTTP_PREFIX = '(https?://)?(www.)?';

    public readonly throttle: Throttle = new Throttle(5000);
    protected readonly pattern: RegExp;

    public constructor(
        public readonly name: string,
        pattern: string,
        flags = 'i',
    ) {
        this.pattern = new RegExp(PatternVisitor.HTTP_PREFIX + pattern, flags);
    }

    public matches(url: string): boolean {
        return this.pattern.exec(url)?.index === 0;
    }

    public async resolveId(url: string, _http: HttpClient): Promise<string | undefined> {
        return this.pattern.exec(url)?.groups?.id;
    }

    public abstract visit(id: string, http: HttpClient): Promise<SiteProfile | undefined>;

    public async visitUrl(url: string, http: HttpClient): Promise<SiteProfile | undefined> {
        await this.throttle.wait();
        const id = await this.resolveId(url, http);
        if (!id) return;
        return this.visit(id, http);
    }
}
