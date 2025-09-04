export type ArchiveStatus = 'pending' | 'processing' | 'completed' | 'failed';

type ArchiveData = {
    id: string;
    url: string;
    path: string;
    title: string;
    description: string;
    thumbnail: string;
    publishedAt: string;
    duration: number;
    status: ArchiveStatus;
};

export class Archive {
    constructor(
        public readonly id: string,
        public readonly url: string,
        public readonly path: string,
        public readonly title: string,
        public readonly description: string,
        public readonly thumbnail: string,
        public readonly publishedAt: string,
        public readonly duration: number,
        public status: ArchiveStatus,
    ) { }

    public key(): string {
        return this.id;
    }

    public static deserialize(data: ArchiveData): Archive {
        return new Archive(
            data.id,
            data.url,
            data.path,
            data.title,
            data.description,
            data.thumbnail,
            data.publishedAt,
            data.duration,
            data.status,
        );
    }

    public static serialize(archive: Archive): ArchiveData {
        return {
            id: archive.id,
            url: archive.url,
            path: archive.path,
            title: archive.title,
            description: archive.description,
            thumbnail: archive.thumbnail,
            publishedAt: archive.publishedAt,
            duration: archive.duration,
            status: archive.status,
        };
    }
}

export type ArchiveConfig = {
    active: boolean;
    yt_dlp_info: {
        version: string;
        git_head: string;
        variant: string;
        update_hint: string;
        channel: string;
        origin: string;
    };
    yt_dlp_options: {
        [key: string]: string;
    };
    output_dir: string;
    archive_limit: {
        size_mb: number;
        count: number;
        duration_days: number;
    };
};
