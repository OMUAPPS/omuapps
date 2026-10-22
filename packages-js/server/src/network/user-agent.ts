import { VERSION } from '@omujs/omu';

export class UserAgent {
    public static readonly VALUE: string = `OMUAPPS/${VERSION}`;

    public static headers(headers: HeadersInit = {}): Headers {
        const result = new Headers(headers);
        if (!result.has('User-Agent')) {
            result.set('User-Agent', UserAgent.VALUE);
        }
        return result;
    }
}
