const paramRegex = /\{([\w]+)\}/g;

export type I18n = {
    translate: TranslateFunction;
    localeName: string;
};

export type Translations = {
    [key: string]: string | Translations;
};

export type TranslateFunction = (key: string, params?: Record<string, string>) => string;

type Unconstrained<T, U extends T = T> = U;

export type I18nKeys<T extends Translations> = Unconstrained<{ [K in keyof T]: T[K] extends Translations ? I18nKeys<T[K]> : string }>;

/**
 * Creates an object with i18n keys for the provided translations object.
 *
 * @param obj - The translations object to create i18n keys for.
 * @param path - The current path within the translations object, used for building the keys.
 * @returns An object with i18n keys for the provided translations.
 */
export function createI18nKeys<T extends Translations>(obj: T, path = ''): I18nKeys<T> {
    const result: any = {};
    for (const key in obj) {
        const newPath = path ? `${path}.${key}` : key;
        if (typeof obj[key] === 'object') {
            Object.assign(result, { [key]: createI18nKeys(obj[key] as Translations, newPath) });
        } else {
            result[key] = newPath;
        }
    }
    return result as I18nKeys<T>;
}

/**
 * Creates an `I18n` instance that can translate using the provided translations object.
 *
 * The `createI18n` function creates an `I18n` instance that can translate strings using the provided `translations` object. It uses a cache to improve performance when looking up translations. The `translate` function in the returned `I18n` instance will first look up the translation in the cache, and if not found, it will traverse the `translations` object to find the translation. If a translation is not found, the original key is returned.
 *
 * @param translations - An object containing the translations for the locale.
 * @param localeName - The name of the locale for the translations.
 * @returns An `I18n` instance that can translate using the provided translations.
 */
export function createI18n(translations: Translations, localeName: string): I18n {
    const translationCache = new Map<string, string>();

    /**
     * Retrieves the translation for the given key from the translations object.
     *
     * The key can be a dot-separated path to access nested translations. If a translation is not found, the original key is returned.
     *
     * @param key - The key to look up the translation for.
     * @returns The translated string, or the original key if a translation is not found.
     */
    function getTranslation(key: string): string {
        if (key === '') return key;
        const cachedTranslation = translationCache.get(key);
        if (cachedTranslation) return cachedTranslation;

        const parts = key.split('.');
        let translation: string | undefined;
        let result = translations;

        for (const part of parts) {
            if (typeof result !== 'object' || result === null) {
                translationCache.set(key, key);
                return key;
            }
            translation = result[part] as string | undefined;
            result = result[part] as Translations;
        }

        if (typeof translation === 'object') {
            translation = translation[''];
        }

        const finalTranslation = translation || key;
        translationCache.set(key, finalTranslation);
        return finalTranslation;
    }

    /**
     * Translates a string key to a localized string, optionally replacing placeholders with provided parameters.
     *
     * @param key - The translation key to look up.
     * @param params - An optional object containing parameter values to replace placeholders in the translation.
     * @returns The translated string, or the original key if no translation is found.
     */
    function translate(key: string, params?: Record<string, string>): string {
        const translation = getTranslation(key);
        if (!params) return translation;

        return translation.replace(paramRegex, (_, key) => params[key] || key);
    }

    return {
        localeName,
        translate,
    };
}

/**
 * Creates a union of multiple `I18n` instances, allowing translation to fall back to other locales if a translation is not found in the primary locale.
 *
 * @param i18Array - An array of `I18n` instances to be combined.
 * @returns An `I18n` instance that can translate using the combined translations from the input array.
 */
export function createI18nUnion(i18Array: I18n[]): I18n {
    const primaryI18n = i18Array[0];
    const fallbackI18ns = i18Array.slice(1);

    /**
    * Translates a string using the primary and fallback i18n instances.
    *
    * @param key - The translation key to look up.
    * @param params - Optional parameters to pass to the translation function.
    * @returns The translated string.
    */
    function translate(key: string, params?: Record<string, string>): string {
        let translated = primaryI18n.translate(key, params);
        if (translated === key) {
            for (const i18n of fallbackI18ns) {
                translated = i18n.translate(key, params);
                if (translated !== key) break;
            }
        }
        return translated;
    }

    return {
        translate,
        localeName: `union(${i18Array.map((i18n) => i18n.localeName).join(', ')})`,
    };
}

/**
 * Asynchronously loads translations for the specified locale and creates an `I18n` instance to handle translation lookups.
 *
 * @param load - A function that returns a Promise resolving to an object containing the default translations.
 * @param locale - The locale to load translations for.
 * @returns An `I18n` instance that can be used to translate strings for the specified locale.
 */
export async function loadI18n(load: () => Promise<{ default: Translations }>, locale: string): Promise<I18n> {
    const { default: translations } = await load();
    return createI18n(translations, locale);
}
