export type SiteProfile = {
    site: string;
    id: string;
    url: string;
    name?: string;
    uniqueId?: string;
    screenId?: string;
    description?: string;
    profilePicture?: string;
    links: string[];
};

export class ProfileNode {
    public readonly children: ProfileNode[] = [];

    public constructor(public readonly profile: SiteProfile) {}

    public flatten(): SiteProfile[] {
        return [this.profile, ...this.children.flatMap((child) => child.flatten())];
    }
}
