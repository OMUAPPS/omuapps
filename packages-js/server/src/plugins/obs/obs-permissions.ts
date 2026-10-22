import { OBSPermissions } from '@omujs/obs';
import type { Identifier } from '@omujs/omu';
import { type PermissionMetadata, PermissionType } from '@omujs/omu/api/permission';

export class ObsPermissions {
    public static readonly ALL: readonly PermissionType[] = [
        ObsPermissions.create(OBSPermissions.OBS_SOURCE_READ_PERMISSION_ID, {
            level: 'low',
            name: { ja: 'ソース情報の読み取り', en: 'Read source' },
            note: { ja: 'OBSのソース情報を取得するために使われます', en: 'Used to access source information on OBS' },
        }),
        ObsPermissions.create(OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID, {
            level: 'medium',
            name: { ja: 'ソースの作成', en: 'Create source' },
            note: { ja: 'OBSにソースを追加するために使われます', en: 'Used to create a new source on OBS' },
        }),
        ObsPermissions.create(OBSPermissions.OBS_SOURCE_UPDATE_PERMISSION_ID, {
            level: 'medium',
            name: { ja: 'ソース情報の更新', en: 'Update source' },
            note: { ja: 'OBSのソースを更新するために使われます', en: 'Used to update source information on OBS' },
        }),
        ObsPermissions.create(OBSPermissions.OBS_SOURCE_REMOVE_PERMISSION_ID, {
            level: 'medium',
            name: { ja: 'ソースの削除', en: 'Remove source' },
            note: { ja: 'OBSのソースを削除するために使われます', en: 'Used to remove a source on OBS' },
        }),
        ObsPermissions.create(OBSPermissions.OBS_SCENE_READ_PERMISSION_ID, {
            level: 'low',
            name: { ja: 'シーン情報の読み取り', en: 'Read scene' },
            note: { ja: 'OBSのシーン情報を使うために使われます', en: 'Used to access scene information on OBS' },
        }),
        ObsPermissions.create(OBSPermissions.OBS_SCENE_CREATE_PERMISSION_ID, {
            level: 'medium',
            name: { ja: 'シーンの作成', en: 'Create scene' },
            note: { ja: 'OBSに新しいシーンを作成するために使われます', en: 'Used to create a new scene on OBS' },
        }),
        ObsPermissions.create(OBSPermissions.OBS_SCENE_UPDATE_PERMISSION_ID, {
            level: 'medium',
            name: { ja: 'シーン情報の更新', en: 'Update scene' },
            note: { ja: 'OBSのシーン情報を更新するために使われます', en: 'Used to update scene information on OBS' },
        }),
        ObsPermissions.create(OBSPermissions.OBS_SCENE_REMOVE_PERMISSION_ID, {
            level: 'medium',
            name: { ja: 'シーンの削除', en: 'Remove scene' },
            note: { ja: 'OBSのシーンを削除するために使われます', en: 'Used to remove a scene on OBS' },
        }),
        ObsPermissions.create(OBSPermissions.OBS_SCENE_SET_CURRENT_PERMISSION_ID, {
            level: 'medium',
            name: { ja: 'シーンの切り替え', en: 'Switch scene' },
            note: { ja: 'OBSのシーンを切り替えるために使われます', en: 'Used to switch a scene on OBS' },
        }),
    ];

    private static create(id: Identifier, metadata: PermissionMetadata): PermissionType {
        return new PermissionType({ id, metadata });
    }
}
