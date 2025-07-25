import { BROWSER } from 'esm-env';
import { getTextureByUri } from './asset.js';
import { createClipFromAudio, createRandomClip } from './audioclip.js';
import bell from './images/bell.png';
import counter_client from './images/counter_client.png';
import cursor_grab from './images/cursor_grab.png';
import cursor_point from './images/cursor_point.png';
import dummy_back from './images/dummy_back.png';
import dummy_front from './images/dummy_front.png';
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


async function awaitBatch<T extends Record<string, Promise<any>>>(promises: T): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
    const entries = await Promise.all(Object.entries(promises).map(([key, promise]) => promise.then(value_1 => [key, value_1] as const)));
    return Object.fromEntries(entries) as {
        [K in keyof T]: Awaited<T[K]>;
    };
}


async function getResources() {
    return {
        counter_client: counter_client,
        bell: bell,
        ...await awaitBatch({
            photo_frame: getTextureByUri(photo_frame),
            counter_client_tex:  getTextureByUri(counter_client),
            bell_tex:  getTextureByUri(bell),
            kitchen_asset:  getTextureByUri(kitchen_asset),
            kitchen_client:  getTextureByUri(kitchen_client),
            dummy_front:  getTextureByUri(dummy_front),
            dummy_back:  getTextureByUri(dummy_back),
            cursor_grab:  getTextureByUri(cursor_grab),
            cursor_point:  getTextureByUri(cursor_point),
            bell_audio_clip: (async () => createRandomClip({
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
            }))(),
        })
    };
}

let promiseResources: Promise<Resources> | null = null;

export function waitResourcesLoaded() {
    if (!BROWSER) return Promise.resolve({}) as Promise<Resources>;
    if (promiseResources) return promiseResources;
    promiseResources = getResources();
    return promiseResources;
}

export type Resources = Awaited<ReturnType<typeof getResources>>;
