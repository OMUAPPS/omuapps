import { type WebviewHandle } from '@omujs/omu/api/dashboard';
import { ReplayApp, type Playback, type Video, type VideoInfo } from './replay-app';

interface Artwork {
    w: number;
    h: number;
    url: string;
}

interface Episode
{
    start: number;
    end: number;
    synopsis: string;
    episodeId: number;
    liveEvent: {
        hasLiveEvent: boolean;
    };
    taglineMessages: {
        tagline: string;
        classification: string;
    };
    requiresAdultVerification: boolean;
    requiresPin: boolean;
    requiresPreReleasePin: boolean;
    creditsOffset: number;
    runtime: number;
    displayRuntime: number;
    watchedToEndOffset: number;
    autoplayable: boolean;
    title: number;
    id: number;
    bookmark: {
        watchedDate: number;
        offset: number;
    };
    skipMarkers: SkipMarkers;
    hd: boolean;
    thumbs: Artwork[];
    stills: Artwork[];
    seq: number;
    hiddenEpisodeNumbers: boolean;
}

interface Season {
    year: number;
    shortName: string;
    longName: string;
    hiddenEpisodeNumbers: boolean;
    title: string;
    id: number;
    seq: number;
    episodes: Episode[];
}

interface SkipMarkers {
    credit: {
        start: number | null;
        end: number | null;
    };
    recap: {
        start: number | null;
        end: number | null;
    };
}

interface NetflixVideo {
    title: string;
    synopsis: string;
    matchScore: {
        isNewForPvr: boolean;
        computeId: string;
        trackingInfo: {
            matchScore: string;
            tooNewForMatchScore: string;
            matchRequestId: string;
        };
    };
    rating: string;
    artwork: Artwork[];
    boxart: Artwork[];
    storyart: Artwork[];
    type: 'show';
    unifiedEntityId: `Video:${number}`;
    id: number;
    skipMarkers: SkipMarkers;
    currentEpisode: number;
    hiddenEpisodeNumbers: boolean;
    requiresAdultVerification: boolean;
    requiresPin: boolean;
    requiresPreReleasePin: boolean;
    seasons?: Season[];
    merchedVideoId: null;
    cinematch: {
        type: 'predicted';
        value: string;
    };
}

export interface Metadata {
    version: string;
    trackIds: {
        nextEpisode: number;
        episodeSelector: number;
    };
    video: NetflixVideo;
}

export type NetflixEvent = {
    type: 'info';
    info: VideoInfo;
    video: Video;
} | {
    type: 'playback';
    playback: Playback;
};

async function init() {
    const state: {
        info: VideoInfo;
        video?: HTMLVideoElement | null;
        metadata?: Metadata;
        originalFetch?: typeof fetch;
    } = {
        info: {},
        video: null,
        originalFetch: undefined,
    };

    function emit(event: NetflixEvent) {
        // @ts-expect-error ts(2339)
        window.webview.emit(event);
    }

    function setInfo(newInfo: Partial<VideoInfo>) {
        state.info = { ...state.info, ...newInfo };
        console.log('VideoInfo updated:', state.info);
        emit({
            type: 'info',
            info: state.info,
            video: { type: 'netflix', id: state.metadata?.video.id.toString() ?? '' },
        });
    }

    function setPlayback(playback: Playback) {
        console.log('Playback:', playback);
        emit({
            type: 'playback',
            playback,
        });
    }

    function observeForVideo() {
        const videoElement = document.querySelector('[data-uia="video-canvas"] video') as HTMLVideoElement | null;
        if (videoElement) {
            attachVideo(videoElement);
            return;
        }

        setTimeout(() => observeForVideo(), 500);
    }

    function attachVideo(video: HTMLVideoElement) {
        if (state.video === video) return;

        if (state.video) {
            state.video.pause();
            state.video.removeEventListener('play', onPlayPause);
            state.video.removeEventListener('pause', onPlayPause);
            state.video.removeEventListener('seeked', onSeeked);
        }

        state.video = video;
        console.info('Video element attached:', video);

        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
            setInfo({ ...state.info, duration: video.duration });
        } else {
            const onLoadedMeta = () => {
                setInfo({ ...state.info, duration: video.duration });
                video.removeEventListener('loadedmetadata', onLoadedMeta);
            };
            video.addEventListener('loadedmetadata', onLoadedMeta);
        }

        video.addEventListener('play', onPlayPause);
        video.addEventListener('pause', onPlayPause);
        video.addEventListener('seeked', onSeeked);

        updatePlaybackFromVideo();
    }

    function onPlayPause() {
        updatePlaybackFromVideo();
    }

    function onSeeked() {
        updatePlaybackFromVideo();
    }

    function updatePlaybackFromVideo() {
        const { video } = state;
        if (!video) return;
        const start = Date.now();
        const offset = video.currentTime;
        const playing = !video.paused && !video.ended;
        setPlayback({ start, offset, playing });
    }

    function patchFetch() {
        if (state.originalFetch) return;
        state.originalFetch = window.fetch.bind(window);

        const proxiedFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
            const url = typeof input === 'string' ? input : input.url;
            try {
                const response = await state.originalFetch!(input, init);

                if (/\/nq\/website\/memberapi\/release\/metadata/.test(url)) {
                    try {
                        const clone = response.clone();
                        const metadata: Metadata = await clone.json();
                        state.metadata = metadata;
                        const episode = metadata.video.seasons?.flatMap(s => s.episodes).find(e => e.id === metadata.video.currentEpisode);
                        let title = metadata.video.title;
                        if (episode) {
                            title += ` - ${episode.seq} - ${episode.title}`;
                        }
                        const storyarts = episode?.thumbs ?? metadata.video?.storyart ?? [];
                        setInfo({
                            title,
                            description: episode?.synopsis ?? metadata.video?.synopsis,
                            thumbnailUrl: storyarts.length ? storyarts[storyarts.length - 1]?.url : undefined,
                        });
                        state.video = undefined;
                        observeForVideo();
                    } catch (innerErr) {
                        console.warn('Failed to parse Netflix metadata:', innerErr);
                    }
                }
                return response;
            } catch (err) {
                console.error('fetch proxy error:', err);
                throw err;
            }
        };

        window.fetch = proxiedFetch as typeof fetch;
    }

    function cleanup() {
        if (state.originalFetch) {
            window.fetch = state.originalFetch as typeof fetch;
            state.originalFetch = undefined;
        }
        if (state.video) {
            state.video.removeEventListener('play', onPlayPause);
            state.video.removeEventListener('pause', onPlayPause);
            state.video.removeEventListener('seeked', onSeeked);
            state.video = null;
        }
        console.info('Cleanup done');
    }

    console.info('Netflix helper init');
    patchFetch();

    observeForVideo();

    window.addEventListener('beforeunload', cleanup);

    return {
        cleanup,
        getInfo: () => ({ ...state.info }),
        getVideo: () => state.video,
    };
}

const LOGIN_SCRIPT = `
(${init.toString()})();
`;

let webview: WebviewHandle | null = null;

export async function openNetflix() {
    if (webview) return;
    const replay = ReplayApp.getInstance();
    const { omu, replayData } = replay;
    webview = await omu.dashboard.requestWebview({
        url: 'https://www.netflix.com/jp/login',
        script: LOGIN_SCRIPT,
    });
    let info: VideoInfo | null = null;
    let video: Video | null = null;
    let playback: Playback | null = null;
    webview.on('message', ({ data }) => {
        const event: NetflixEvent = data;
        if (event.type === 'info') {
            info = event.info;
            video = event.video;
        } else if (event.type === 'playback') {
            playback = event.playback;
        }
        if (!info || !video || !playback) return;
        replayData.set({
            video,
            info,
            playback,
        });
    });
    webview.join().then(() => {
        webview = null;
    });
}
