import kitchen_asset from '../images/kitchen_asset.png';
import kitchen_client from '../images/kitchen_client.png';
import photo_frame from '../images/photo_frame.svg';
import { getTextureByUri } from './asset.js';

export async function getResources() {
    return {
        photo_frame: await getTextureByUri(photo_frame),
        kitchen_asset: await getTextureByUri(kitchen_asset),
        kitchen_client: await getTextureByUri(kitchen_client),
    }
}

export type Resources = Awaited<ReturnType<typeof getResources>>;
