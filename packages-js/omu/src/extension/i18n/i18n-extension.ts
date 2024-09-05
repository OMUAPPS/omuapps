import type { Client } from '../../client.js';
import type { Locale } from '../../localization/locale.js';
import type { LocalizedText } from '../../localization/localization.js';
import type { Extension } from '../extension.js';
import { ExtensionType } from '../extension.js';
import type { Registry } from '../registry/index.js';
import { RegistryType } from '../registry/index.js';

export const I18N_EXTENSION_TYPE = new ExtensionType('i18n', (client) => new I18nExtension(client));

export const I18N_SET_LOCALES_PERMISSION_ID = I18N_EXTENSION_TYPE.join('locales', 'set');
export const I18N_GET_LOCALES_PERMISSION_ID = I18N_EXTENSION_TYPE.join('locales', 'get');
const I18N_LOCALES_REGISTRY_TYPE = RegistryType.createJson<Locale[]>(I18N_EXTENSION_TYPE, {
    name: 'locales',
    defaultValue: [],
});

export class I18nExtension implements Extension {
    public readonly type = I18N_EXTENSION_TYPE;
    public readonly localesRegistry: Registry<Locale[]>;
    private locales?: Locale[];
    public defaultLocales?: Locale[];

    constructor(private readonly client: Client) {
        client.permissions.require(I18N_GET_LOCALES_PERMISSION_ID);
        this.localesRegistry = client.registries.get(I18N_LOCALES_REGISTRY_TYPE);
        this.localesRegistry.listen((locale) => {
            this.locales = locale;
        });
    }

    public getLocales(): readonly Locale[] {
        if (this.locales && this.locales.length > 0) {
            return this.locales;
        }
        if (!this.defaultLocales || this.defaultLocales.length === 0) {
            throw new Error('Default locales are not set');
        }
        return this.defaultLocales;
    }

    public translate(localizedText: LocalizedText): string {
        const locales = this.getLocales();
        if (typeof localizedText === 'string') {
            return localizedText;
        }
        const translation = this.selectBestTranslation(locales, localizedText);
        if (!translation) {
            return Object.values(localizedText)[0];
        }
        return translation;
    }

    public selectBestTranslation(
        locales: readonly Locale[],
        localizedText: LocalizedText,
    ): string | undefined {
        if (typeof localizedText === 'string') {
            return localizedText;
        }
        const translations = localizedText;
        const transformedLocales = locales.reduce((acc, l) => {
            const parts = l.split('-');
            for (let i = parts.length; i > 0; i--) {
                acc.push(parts.slice(0, i).join('-'));
            }
            return acc;
        }, [] as string[]);
        for (const l of transformedLocales) {
            const translation = translations[l];
            if (translation) {
                return translation;
            }
        }
        return undefined;
    }

    public setLocale(locale: Locale[]): Promise<void> {
        return this.localesRegistry.set(locale);
    }
}
