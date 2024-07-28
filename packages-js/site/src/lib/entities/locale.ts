import { LOCALE_NAMES } from '@omujs/omu/localization/locale.js';
import t from 'typeorm';

@t.Entity({ name: 'locale' })
export class Locale {
    @t.PrimaryColumn({ type: 'text' })
    code: string;

    @t.Column({ type: 'text' })
    languageName: string;

    public static builder(): LocaleBuilder {
        return new LocaleBuilder();
    }
}

export class LocaleBuilder {
    private code: string | null = null;
    private languageName: string | null = null;

    public setCode(code: string): LocaleBuilder {
        this.code = code;
        return this;
    }

    public setLanguageName(languageName: string): LocaleBuilder {
        this.languageName = languageName;
        return this;
    }

    public build(): Locale {
        if (!this.code) {
            throw new Error('Code is required');
        }
        if (!this.languageName) {
            throw new Error('Language name is required');
        }
        const locale = new Locale();
        locale.code = this.code;
        locale.languageName = this.languageName;
        return locale;
    }
}

type LocaleKey = keyof typeof LOCALE_NAMES;
export const LOCALES: Record<LocaleKey, Locale> = Object.fromEntries(
    Object.entries(LOCALE_NAMES).map(([key, value]) => [
        key,
        Locale.builder().setCode(key).setLanguageName(value).build(),
    ]),
) as Record<LocaleKey, Locale>;
