import { IS_BETA } from '$lib/consts.js';
import type { AppMetadata } from '@omujs/omu';
import type { LocalizedText } from '@omujs/omu/localization';
import { DEV } from 'esm-env';

const CF_PAGES_URL = IS_BETA ? 'https://beta.omuapps.com' : 'https://omuapps.com';
export const ORIGIN = DEV ? 'http://localhost:5173' : new URL(CF_PAGES_URL).origin;
export const APP_INDEX = ORIGIN + '/apps.json';
export const CHANNEL = IS_BETA ? ' (開発版)' : '';

export function getUrl(path: string): string {
    const url = new URL(path, ORIGIN);
    return url.href;
}

function mapLocalized(value: LocalizedText, fn: (value: string, locale?: string) => string): LocalizedText {
    if (typeof value === 'string') {
        return fn(value);
    }
    return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, fn(value, key)]));
}

export function buildMetadata(metadata: AppMetadata): AppMetadata {
    if (metadata.icon) {
        metadata.icon = mapLocalized(metadata.icon, (value) => value.startsWith('ti-') ? value : getUrl(value));
    }
    if (metadata.image) {
        metadata.image = mapLocalized(metadata.image, getUrl);
    }
    if (metadata.name) {
        metadata.name = mapLocalized(metadata.name, value => `${value}${CHANNEL}`);
    }
    return metadata;
}

export const NAMESPACE = 'com.omuapps';
