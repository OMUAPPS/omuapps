import type { SiteVisitor } from '../crawl';

import { BandcampVisitor } from './bandcamp.js';
import { BoothVisitor } from './booth.js';
import { FanboxVisitor } from './fanbox.js';
import { GithubVisitor } from './github.js';
import { InstagramVisitor } from './instagram.js';
import { ItchioVisitor } from './itchio.js';
import { KofiVisitor } from './kofi.js';
import { LinktreeVisitor } from './linktree.js';
import { LitLinkVisitor } from './litlink.js';
import { MarshmallowQaVisitor } from './marshmallow-qa.js';
import { MirrativVisitor } from './mirrativ.js';
import { NicovideoVisitor } from './nicovideo.js';
import { NoteVisitor } from './note.js';
import { PatreonVisitor } from './patreon.js';
import { PicartoVisitor } from './picarto.js';
import { PixivVisitor } from './pixiv.js';
import { RedditVisitor } from './reddit.js';
import { SkebVisitor } from './skeb.js';
import { SketchVisitor } from './sketch.js';
import { SoundcloudVisitor } from './soundcloud.js';
import { SpotifyVisitor } from './spotify.js';
import { TikTokVisitor } from './tiktok.js';
import { TwitCastingVisitor } from './twitcasting.js';
import { TwitchVisitor } from './twitch.js';
import { XVisitor } from './x.js';
import { YoutubeVisitor } from './youtube.js';

export class Sites {
    public static readonly youtube: YoutubeVisitor = new YoutubeVisitor();
    public static readonly twitch: TwitchVisitor = new TwitchVisitor();
    public static readonly picarto: PicartoVisitor = new PicartoVisitor();

    public static readonly all: readonly SiteVisitor[] = [
        new BandcampVisitor(),
        new BoothVisitor(),
        new FanboxVisitor(),
        new InstagramVisitor(),
        new LinktreeVisitor(),
        new LitLinkVisitor(),
        new MirrativVisitor(),
        new NicovideoVisitor(),
        new NoteVisitor(),
        new PixivVisitor(),
        new RedditVisitor(),
        new SketchVisitor(),
        new SoundcloudVisitor(),
        new TikTokVisitor(),
        new TwitCastingVisitor(),
        Sites.twitch,
        new XVisitor(),
        Sites.youtube,
        new SpotifyVisitor(),
        new GithubVisitor(),
        new ItchioVisitor(),
        new KofiVisitor(),
        new PatreonVisitor(),
        new SkebVisitor(),
        new MarshmallowQaVisitor(),
        Sites.picarto,
    ];
}

export {
    BandcampVisitor,
    BoothVisitor,
    FanboxVisitor,
    GithubVisitor,
    InstagramVisitor,
    ItchioVisitor,
    KofiVisitor,
    LinktreeVisitor,
    LitLinkVisitor,
    MarshmallowQaVisitor,
    MirrativVisitor,
    NicovideoVisitor,
    NoteVisitor,
    PatreonVisitor,
    PicartoVisitor,
    PixivVisitor,
    RedditVisitor,
    SkebVisitor,
    SketchVisitor,
    SoundcloudVisitor,
    SpotifyVisitor,
    TikTokVisitor,
    TwitCastingVisitor,
    TwitchVisitor,
    XVisitor,
    YoutubeVisitor,
};
