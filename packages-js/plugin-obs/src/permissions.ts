import { PLUGIN_ID } from './const.js';

export const OBS_PERMISSION_ID = PLUGIN_ID.join('obs');
export const OBS_SOURCE_READ_PERMISSION_ID = PLUGIN_ID.join('source', 'read');
export const OBS_SOURCE_CREATE_PERMISSION_ID = PLUGIN_ID.join('source', 'create');
export const OBS_SOURCE_UPDATE_PERMISSION_ID = PLUGIN_ID.join('source', 'write');
export const OBS_SOURCE_REMOVE_PERMISSION_ID = PLUGIN_ID.join('source', 'remove');
export const OBS_SCENE_READ_PERMISSION_ID = PLUGIN_ID.join('scene', 'read');
export const OBS_SCENE_CREATE_PERMISSION_ID = PLUGIN_ID.join('scene', 'create');
export const OBS_SCENE_UPDATE_PERMISSION_ID = PLUGIN_ID.join('scene', 'write');
export const OBS_SCENE_REMOVE_PERMISSION_ID = PLUGIN_ID.join('scene', 'remove');
export const OBS_SCENE_SWITCH_PERMISSION_ID = PLUGIN_ID.join('scene', 'switch');
