import {
    DASHBOARD_APP_CLOSE_PERMISSION_ID,
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DASHBOARD_APP_STARTUP_PERMISSION_ID,
    DASHBOARD_DRAG_DROP_PERMISSION_ID,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHBOARD_SET_PERMISSION_ID,
    DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
    DASHBOARD_WEBVIEW_PERMISSION_ID,
} from '@omujs/omu/api/dashboard';
import { PermissionType } from '@omujs/omu/api/permission';

export class DashboardPermissions {
    public static readonly ALL: readonly PermissionType[] = [
        new PermissionType({
            id: DASHBOARD_SET_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: '管理者権限', en: 'Manage the dashboard' },
                note: { ja: 'アプリが権限の管理やユーザーに確認を行うために使われます', en: 'Used by apps to manage permissions and confirm users' },
            },
        }),
        new PermissionType({
            id: DASHBOARD_OPEN_APP_PERMISSION_ID,
            metadata: {
                level: 'medium',
                name: { ja: 'アプリを開く', en: 'Open an app' },
                note: { ja: 'インストールされているアプリを起動するために使われます', en: 'Used to start an installed app' },
            },
        }),
        new PermissionType({
            id: DASHBOARD_APP_INSTALL_PERMISSION_ID,
            metadata: {
                level: 'high',
                name: { ja: 'アプリを追加', en: 'Install an app' },
                note: { ja: '新しくアプリを追加するために使われます', en: 'Used to install an app' },
            },
        }),
        new PermissionType({
            id: DASHBOARD_DRAG_DROP_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: 'ファイルのドラッグドロップ', en: 'Get File Drag Drop Information' },
            },
        }),
        new PermissionType({
            id: DASHBOARD_WEBVIEW_PERMISSION_ID,
            metadata: {
                level: 'high',
                name: { ja: '外部サイトの認証情報を要求', en: 'Use external sites login information' },
                note: { ja: '許可したサイトへのすべての操作が可能になります', en: 'All operations on the site will be enabled.' },
            },
        }),
        new PermissionType({
            id: DASHBOARD_APP_CLOSE_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: 'アプリを閉じる', en: 'Close an app' },
            },
        }),
        new PermissionType({
            id: DASHBOARD_APP_STARTUP_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: 'アプリを自動起動に追加', en: 'Start an app' },
            },
        }),
        new PermissionType({
            id: DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
            metadata: {
                level: 'medium',
                name: { ja: '音声認識を使用', en: 'Use Speech Recognition' },
            },
        }),
    ];
}
