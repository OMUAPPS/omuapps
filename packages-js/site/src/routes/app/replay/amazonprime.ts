import { type WebviewHandle } from '@omujs/omu/api/dashboard';
import { ReplayApp, type Playback, type Video, type VideoInfo } from './replay-app';

interface Metadata {
    resources: {
        catalogMetadataV2: {
            catalog: {
                type: 'EPISODE';
                entityType: 'TV Show';
                title: string;
                seriesTitle: string;
                episodeNumber: number;
                seasonNumber: number;
                originalLanguages: string[];
            };
            images: {
                coverImage: string;
                boxartImage: string;
                heroImage?: string;
            };
        };
    };
}

interface VodPlaybackResources {
    'vodPlaylistedPlaybackUrls': {
        'result': {
            'playbackUrls': {
                'intraTitlePlaylist':
                (
                    {
                        'type': 'Remote';
                        'resolutionConstraints': {
                            'maxMsInAdvance': number;
                        };
                        'urlsInPriorityOrder': string[];
                    } |
                    {
                        'type': 'Main';
                        'startMs': number;
                        'endMs': number;
                    }
                )[];
            };
        };
    };
}

interface AdPlaylist {
    'playlist': {
        'description': {
            'duration': '00:00:32.032';
        };
    }[];
}

export type PrimeEvent = {
    type: 'info';
    info: VideoInfo;
    video: Video;
} | {
    type: 'playback';
    playback: Playback;
};

declare global {
    const chrome: {
        webview: unknown;
    };
}

async function init() {
    // 動画が読み込まれないため、Amazon Prime Videoのサイトではchrome.webviewを削除する
    delete chrome.webview;

    const state: {
        info: VideoInfo;
        video?: HTMLVideoElement | null;
        metadata?: Metadata;
        vod?: VodPlaybackResources;
        ads: Map<string, AdPlaylist>;
        originalFetch?: typeof fetch;
        originalXHR?: typeof XMLHttpRequest;
    } = {
        info: {},
        video: null,
        ads: new Map(),
        originalFetch: undefined,
        originalXHR: undefined,
    };

    function emit(event: PrimeEvent) {
        // @ts-expect-error ts(2339)
        window.webview.emit(event);
    }

    function setInfo(newInfo: Partial<VideoInfo>) {
        state.info = { ...state.info, ...newInfo };
        console.log('VideoInfo updated:', state.info);
        emit({
            type: 'info',
            info: state.info,
            video: { type: 'amazonprime' },
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
        const videoElement = document.querySelector('[id*="dv-web-player"][class="dv-player-fullscreen"] video') as HTMLVideoElement | null;
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

    function getAdDuration(path: string) {
        const url = new URL(path, 'https://amazon.com/');
        const sessionId = url.searchParams.get('adDeliverySessionId');
        if (!sessionId) return 0;
        const ad = state.ads.get(sessionId);
        if (!ad) return 0;
        return ad.playlist.reduce((acc, item) => {
            const [min, sec, ms] = item.description.duration.split(':').map(Number);
            return acc + min * 60 * 1000 + sec * 1000 + ms;
        }, 0);
    }

    function calculateRealVideoTime(time: number): number {
        if (!state.vod) return time;
        const playlist = state.vod.vodPlaylistedPlaybackUrls.result.playbackUrls.intraTitlePlaylist;
        let realTime = time * 1000;
        for (const item of playlist) {
            if (item.type === 'Main') {
                if (realTime < item.endMs) {
                    return realTime / 1000;
                }
            } else if (item.type === 'Remote') {
                const adDuration = getAdDuration(item.urlsInPriorityOrder[0]);
                realTime -= adDuration;
            }
        }
        return realTime / 1000;
    }

    function updatePlaybackFromVideo() {
        const { video } = state;
        if (!video) return;
        const start = Date.now();
        const offset = calculateRealVideoTime(video.currentTime);
        const playing = !video.paused && !video.ended;
        setPlayback({ start, offset, playing });
    }

    function patchFetch() {
        if (state.originalFetch) return;
        state.originalFetch = window.fetch.bind(window);

        const proxyFetch = async (request: Request, response: Response): Promise<Response> => {
            const url = new URL(request.url);

            if (
                /\/cdp\/lumina\/playerChromeResources/gm.test(url.pathname) &&
                url.searchParams.get('desiredResources')?.includes('catalogMetadataV2')
            ) {
                try {
                    const clone = response.clone();
                    const metadata: Metadata = await clone.json();
                    console.log(metadata);
                    state.metadata = metadata;
                    const { catalog, images } = metadata.resources.catalogMetadataV2;
                    setInfo({
                        title: catalog.title,
                        thumbnailUrl: images.coverImage,
                    });
                    state.video = undefined;
                    observeForVideo();
                } catch (innerErr) {
                    console.warn('Failed to parse Netflix metadata:', innerErr);
                }
            }
            if (
                /\/playback\/prs\/GetVodPlaybackResources/gm.test(url.pathname)
            ) {
                try {
                    const clone = response.clone();
                    const vod: VodPlaybackResources = await clone.json();
                    state.vod = vod;
                    const playlist = vod.vodPlaylistedPlaybackUrls.result.playbackUrls.intraTitlePlaylist;
                    const duration = playlist.reduce((acc, item) => acc + (item.type === 'Main' ? item.endMs - item.startMs : 0), 0) / 1000;
                    setInfo({
                        duration,
                    });
                } catch (innerErr) {
                    console.warn('Failed to parse Netflix metadata:', innerErr);
                }
            }
            if (
                /\/getVideoAds/gm.test(url.pathname)
            ) {
                try {
                    const clone = response.clone();
                    const adPlaylist: AdPlaylist = await clone.json();
                    state.ads.set(url.searchParams.get('adDeliverySessionId') ?? '', adPlaylist);
                    console.log('Ad playlist updated:', state.ads);
                } catch (innerErr) {
                    console.warn('Failed to parse ad playlist:', innerErr);
                }
            }
            return response;
        };

        // Proxy fetch
        window.fetch = new Proxy(window.fetch, {
            apply(target: (input: RequestInfo, init?: RequestInit) => Promise<Response>, thisArg: unknown, argArray: [RequestInfo, RequestInit | undefined]) {
                const [input, init] = argArray;
                const result = target(input, init);
                const request = new Request(input, init);
                result.then(response => {
                    proxyFetch(request, response);
                }).catch(err => {
                    console.error('fetch proxy error:', err);
                });
                return result;
            },
        }) as typeof window.fetch;

        // Proxy xhr
        if (window.XMLHttpRequest) {
            state.originalXHR = window.XMLHttpRequest;
            const requests = new Map<XMLHttpRequest, Request>();
            const ProxyXHR = function (this: XMLHttpRequest) {
                const xhr = new state.originalXHR!();

                const open = xhr.open;
                xhr.open = function (method: string, url: string, ...rest) {
                    const request = new Request(url, { method });
                    requests.set(xhr, request);
                    // @ts-expect-error proxy
                    return open.apply(this, [method, url, ...rest]);
                } as typeof xhr.open;

                const send = xhr.send;

                xhr.send = function (body?: Document | BodyInit | null) {
                    const request = requests.get(xhr);
                    if (request) {
                        this.addEventListener('load', function () {
                            const response = new Response(this.response, {
                                status: this.status,
                                statusText: this.statusText,
                            });
                            proxyFetch(request, response);
                        });
                    }
                    // @ts-expect-error proxy
                    return send.apply(this, [body]);
                };

                return xhr;
            } as unknown as typeof XMLHttpRequest;
            window.XMLHttpRequest = ProxyXHR;
        }
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

export async function openAmazonPrime() {
    if (webview) return;
    const replay = ReplayApp.getInstance();
    const { omu, replayData } = replay;
    webview = await omu.dashboard.requestWebview({
        url: 'https://www.amazon.co.jp/gp/video/movie',
        script: LOGIN_SCRIPT,
    });
    let info: VideoInfo | null = null;
    let video: Video | null = null;
    let playback: Playback | null = null;
    webview.on('message', ({ data }) => {
        const event: PrimeEvent = data;
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
