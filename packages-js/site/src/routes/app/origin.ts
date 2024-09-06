import { CF_PAGES_URL } from '$lib/consts.js';
import { Identifier } from '@omujs/omu';
import { DEV } from 'esm-env';

export const ORIGIN = DEV ? 'http://localhost:5173' : new URL(CF_PAGES_URL).origin;
export function getUrl(path: string): string {
    const url = new URL(path, ORIGIN);
    return url.href;
}

export const NAMESPACE = DEV ? 'com.omuapps' : Identifier.namespaceFromUrl(CF_PAGES_URL);
