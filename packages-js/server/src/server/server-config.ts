import { LocalAddress } from '../network';

export class ServerConfig {
    public static readonly DEFAULT_PORT = 26423;

    public constructor(
        public readonly root: string,
        public readonly host: string = LocalAddress.lan(),
        public readonly port: number = ServerConfig.DEFAULT_PORT,
        public readonly hash: string | undefined = undefined,
        public readonly dashboardToken: string | undefined = undefined,
        public readonly dashboardPath: string | undefined = undefined,
        public readonly trustedHosts: Record<string, string> = {},
        public readonly debug: boolean = false,
    ) {}
}
