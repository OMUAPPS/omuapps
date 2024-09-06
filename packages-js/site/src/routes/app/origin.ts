import { DEV } from 'esm-env';

export const ORIGIN = DEV ? 'http://localhost:5173' : 'https://omuapps.com';
export function getUrl(path: string): string {
    const url = new URL(path, ORIGIN);
    return url.href;
}

export const NAMESPACE = 'com.omuapps';
