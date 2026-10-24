import { App, AppIndexRegistry, type AppIndexRegistryJSON, type DependencySpecifier, Identifier } from '@omujs/omu';

import { UserAgent } from '../../network';
import type { TrustedHosts } from '../../security';

export class AppIndexes {
    public constructor(
        private readonly hosts: TrustedHosts,
    ) {}

    public async fetch(url: string | URL): Promise<AppIndexRegistry> {
        const response = await fetch(url, {
            headers: UserAgent.headers({ 'Content-Type': 'application/json' }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        const json: AppIndexRegistryJSON = await response.json();
        return AppIndexRegistry.fromJSON(json);
    }

    public async resolveDependencies(app: App): Promise<Map<string, App>> {
        const indexes = new Map<string, AppIndexRegistry>();
        const dependencies = new Map<string, App>();
        for (const [key, specifier] of Object.entries(app.dependencies)) {
            const id = Identifier.fromKey(key);
            const url = this.indexUrl(id, specifier).toString();
            let index = indexes.get(url);
            if (!index) {
                index = await this.fetch(url).catch((error) => {
                    throw new Error(`Failed to fetch index from ${url}: ${error}`);
                });
                indexes.set(url, index);
            }
            const dependency = index.apps.get(id);
            if (!dependency) throw new Error(`Dependency ${key} not found in index ${url}`);
            dependencies.set(key, dependency);
        }
        return dependencies;
    }

    public mappedUrl(url: string | URL): URL {
        return this.hosts.mapUrl(url);
    }

    public mappedNamespace(url: string | URL): string {
        return Identifier.namespaceFromUrl(this.mappedUrl(url));
    }

    private indexUrl(id: Identifier, specifier: DependencySpecifier | string): URL {
        if (typeof specifier !== 'string' && specifier.index) {
            if (this.mappedNamespace(specifier.index) !== id.namespace) {
                throw new Error(`Invalid Index ID: ${this.mappedNamespace(specifier.index)} != ${id.namespace}`);
            }
            return new URL(specifier.index);
        }
        const host = id.namespace.split('.').reverse().join('.');
        return new URL(`http://${host}/_omuapps.json`);
    }
}
