export class ProfileUrl {
    private static readonly PATTERN = /^(?<protocol>https?)?:?\/?\/?(?<domain>[^.]+\.[^/]+)(?<path>[^?#]+)?(?<query>.+)?/;

    public static normalize(url: string): string | undefined {
        const match = ProfileUrl.PATTERN.exec(ProfileUrl.decode(String(url).trim()));
        if (!match?.groups) return;
        const { domain, path = '', query = '' } = match.groups;
        return `https://${domain}${path}${query}`;
    }

    private static decode(url: string): string {
        try {
            return decodeURIComponent(url);
        } catch {
            return url;
        }
    }
}
