import { Identifier } from '../../identifier';
import type { Locale } from '../../localization/locale.js';
import type { LocalizedText } from '../../localization/localization.js';
import { Omu } from '../../omu';
import type { Extension } from '../extension.js';
import { ExtensionType } from '../extension.js';
import { RegistryType, type Registry } from '../registry';

export const I18N_EXTENSION_TYPE: ExtensionType<I18nExtension> = new ExtensionType('i18n', (client) => new I18nExtension(client));

export const I18N_SET_LOCALES_PERMISSION_ID: Identifier = I18N_EXTENSION_TYPE.join('locales', 'set');
export const I18N_GET_LOCALES_PERMISSION_ID: Identifier = I18N_EXTENSION_TYPE.join('locales', 'get');
const I18N_LOCALES_REGISTRY_TYPE = RegistryType.createJson<Locale[]>(I18N_EXTENSION_TYPE, {
    name: 'locales',
    defaultValue: typeof window === 'undefined' ? [] : window.navigator.languages as Locale[],
});

export class I18nExtension implements Extension {
    public readonly type: ExtensionType<I18nExtension> = I18N_EXTENSION_TYPE;
    public readonly localesRegistry: Registry<Locale[]>;

    constructor(private readonly omu: Omu) {
        this.localesRegistry = omu.registries.get(I18N_LOCALES_REGISTRY_TYPE);
    }

    public translate(localizedText: LocalizedText): string {
        const locales = this.localesRegistry.value;
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
