import { getTextureByUri } from './asset.js';
import { createClipFromAudio, createRandomClip } from './audioclip.js';
import kitchen_asset from './images/kitchen_asset.png';
import kitchen_client from './images/kitchen_client.png';
import photo_frame from './images/photo_frame.svg';
import bell_1 from './sounds/bell_1.wav';
import bell_2 from './sounds/bell_2.wav';
import bell_3 from './sounds/bell_3.wav';
import bell_4 from './sounds/bell_4.wav';
import bell_5 from './sounds/bell_5.wav';
import bell_6 from './sounds/bell_6.wav';
import bell_7 from './sounds/bell_7.wav';
import bell_8 from './sounds/bell_8.wav';

export async function getResources() {
    return {
        photo_frame: await getTextureByUri(photo_frame),
        kitchen_asset: await getTextureByUri(kitchen_asset),
        kitchen_client: await getTextureByUri(kitchen_client),
        bell_audio_clip: createRandomClip({
            seed: 1337,
            clips: await Promise.all([
                bell_1,
                bell_2,
                bell_3,
                bell_4,
                bell_5,
                bell_6,
                bell_7,
                bell_8,
            ].map(url => createClipFromAudio({ type: 'url', url }))),
        }),
    };
}

export type Resources = Awaited<ReturnType<typeof getResources>>;
