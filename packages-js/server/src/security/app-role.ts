import type { AppType } from '@omujs/omu';

export type ConnectionCheck = 'frame-token' | 'local-address' | 'origin';

export class AppRole {
    private static readonly APP = new AppRole(['local-address', 'origin'], true, true, false);
    private static readonly REMOTE = new AppRole(['frame-token'], true, false, false);
    private static readonly PLUGIN = new AppRole(['local-address'], false, true, false);
    private static readonly DASHBOARD = new AppRole(['local-address'], false, true, true);
    private static readonly ROLES: Record<AppType, AppRole> = {
        app: AppRole.APP,
        service: AppRole.APP,
        remote: AppRole.REMOTE,
        plugin: AppRole.PLUGIN,
        dashboard: AppRole.DASHBOARD,
    };

    private constructor(
        public readonly connectionChecks: readonly ConnectionCheck[],
        public readonly receivesToken: boolean,
        public readonly canRequest: boolean,
        public readonly managesDashboard: boolean,
    ) {}

    public static of(type: AppType): AppRole {
        return AppRole.ROLES[type] ?? AppRole.APP;
    }
}
