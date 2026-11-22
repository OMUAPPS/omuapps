export interface TrustedHostSource {
    hosts(): Record<string, string>;
}

export class TrustedHosts {
    private source: TrustedHostSource | undefined;

    public constructor(
        private readonly extra: Record<string, string>,
    ) {}

    public setSource(source: TrustedHostSource): void {
        this.source = source;
    }

    public mapHost(host: string): string {
        const hosts = { ...this.source?.hosts(), ...this.extra };
        return hosts[host] || host;
    }

    public mapUrl(url: string | URL): URL {
        const mapped = new URL(url);
        const host = this.mapHost(mapped.host);
        if (host !== mapped.host) {
            mapped.host = host;
        }
        return mapped;
    }
}
