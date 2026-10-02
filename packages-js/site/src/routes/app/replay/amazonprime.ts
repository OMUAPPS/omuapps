import type { WebviewHandle } from '@omujs/omu/api/dashboard';
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
            'duration': string;
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
        seekbarOffset?: number;
        playbackTimer?: ReturnType<typeof setInterval>;
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
        emit({
            type: 'playback',
            playback,
        });
    }

    function observeForVideo() {
        const videoElement = document.querySelector('[id*="dv-web-player"] video') as HTMLVideoElement | null;
        if (videoElement) {
            attachVideo(videoElement);
            return;
        }
    }

    function attachVideo(video: HTMLVideoElement) {
        if (state.video === video) return;

        if (state.video) {
            state.video.removeEventListener('play', onPlayPause);
            state.video.removeEventListener('pause', onPlayPause);
            state.video.removeEventListener('seeked', onSeeked);
        }

        state.video = video;
        state.seekbarOffset = undefined;
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
        const markerId = url.searchParams.get('adMarkerId');
        if (!sessionId || !markerId) return 0;
        const ad = state.ads.get(JSON.stringify([sessionId, markerId]));
        if (!ad) return 0;
        return ad.playlist.reduce((acc, item) => {
            const [hours, minutes, seconds] = item.description.duration.split(':').map(Number);
            const duration = (hours * 3600 + minutes * 60 + seconds) * 1000;
            return acc + (Number.isFinite(duration) && duration >= 0 ? duration : 0);
        }, 0);
    }

    function calculateRealVideoTime(time: number): { offset: number; advertising: boolean } {
        if (!state.vod) return { offset: time, advertising: false };
        const playlist = state.vod.vodPlaylistedPlaybackUrls.result.playbackUrls.intraTitlePlaylist;
        let realTime = time * 1000;
        let contentTime = 0;
        for (const item of playlist) {
            if (item.type === 'Main') {
                if (realTime < item.endMs) {
                    return { offset: Math.max(item.startMs, realTime) / 1000, advertising: false };
                }
                contentTime = item.endMs;
            } else if (item.type === 'Remote') {
                const adDuration = getAdDuration(item.urlsInPriorityOrder[0]);
                if (realTime < contentTime + adDuration) {
                    return { offset: contentTime / 1000, advertising: true };
                }
                realTime -= adDuration;
            }
        }
        return { offset: contentTime / 1000, advertising: false };
    }

    function updatePlaybackFromVideo() {
        const { video } = state;
        if (!video) return;
        const start = Date.now();
        let { offset, advertising } = calculateRealVideoTime(video.currentTime);
        // Amazon's seekbar uses the content timeline, including when ads are removed after viewing.
        const seekbar = document.querySelector<HTMLInputElement>('[id*="dv-web-player"] input[type="range"][aria-label="Seek"]');
        const value = seekbar?.valueAsNumber;
        if (value !== undefined && Number.isFinite(value) && value >= 0 && value <= 100 && state.info.duration) {
            offset = state.info.duration * value / 100;
            // A frozen content position must not advance on the receiver during an ad or buffering.
            advertising = state.seekbarOffset === undefined || offset === state.seekbarOffset;
            state.seekbarOffset = offset;
        } else {
            state.seekbarOffset = undefined;
        }
        const playing = !video.paused && !video.ended && !video.seeking && !advertising;
        setPlayback({ start, offset, playing });
    }

    function patchFetch() {
        if (state.originalFetch) return;
        state.originalFetch = window.fetch;

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
                    state.seekbarOffset = undefined;
                    updatePlaybackFromVideo();
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
                    const sessionId = url.searchParams.get('adDeliverySessionId');
                    const markerId = url.searchParams.get('adMarkerId');
                    if (sessionId && markerId) {
                        state.ads.set(JSON.stringify([sessionId, markerId]), adPlaylist);
                        updatePlaybackFromVideo();
                    }
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
        clearInterval(state.playbackTimer);
        if (state.originalFetch) {
            window.fetch = state.originalFetch as typeof fetch;
            state.originalFetch = undefined;
        }
        if (state.originalXHR) {
            window.XMLHttpRequest = state.originalXHR;
            state.originalXHR = undefined;
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
    state.playbackTimer = setInterval(() => {
        observeForVideo();
        updatePlaybackFromVideo();
    }, 250);

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
