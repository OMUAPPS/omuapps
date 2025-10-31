interface PlayerOptions {
    width;
    height;
    channel?;
    video?;
    collection?;
    parent;
    autoplay?: boolean;
}

interface PlaybackStats {
    backendVersion: string;
    bufferSize: number;
    codecs: string;
    displayResolution: string;
    fps: number;
    hlsLatencyBroadcaster: number;
    playbackRate: number;
    skippedFrames: number;
    videoResolution: string;
}

class Player {
    constructor(id: string, options: PlayerOptions);
    static CAPTIONS; //	Closed captions are found in the video content being played. This event will be emitted once for each new batch of captions, in sync with the corresponding video content. The event payload is a string containing the caption content.
    static ENDED; //	Video or stream ends.
    static PAUSE; //	Player is paused. Buffering and seeking is not considered paused.
    static PLAY; //	Player just unpaused, will either start video playback or start buffering.
    static PLAYBACK_BLOCKED; //	Player playback was blocked. Usually fired after an unmuted autoplay or unmuted programmatic call on play().
    static PLAYING; //	Player started video playback.
    static OFFLINE; //	Loaded channel goes offline.
    static ONLINE; //	Loaded channel goes online.
    static READY; //	Player is ready to accept function calls.
    static SEEK; //	User has used the player controls to seek a VOD, the seek() method has been called, or live playback has seeked to sync up after being paused.
    addEventListener(event, callback);
    setVolume(volume: number);
    disableCaptions(): void;
    enableCaptions(): void;
    pause(): void;
    play(): void;
    seek(timestamp: number): void;
    setChannel(channel: string): void;
    setCollection(collectionID: string, videoID: string): void;
    setQuality(quality: string): void;
    setVideo(videoID: string, timestamp: number): void;
    getMuted(): boolean;
    setMuted(muted: boolean): void;
    getVolume(): number;
    setVolume(volumelevel: number): void;
    getPlaybackStats(): PlaybackStats;
    getChannel(): string;
    getCurrentTime(): number;
    getDuration(): number;
    getEnded(): boolean;
    getQualities(): string[];
    getQuality(): string;
    getVideo(): string;
    isPaused(): boolean;
}

interface Twitch {
    Player: typeof Player;
}

declare let Twitch: Twitch;
