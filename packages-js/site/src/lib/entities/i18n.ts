import t from 'typeorm';
import { Locale } from './locale.js';

@t.Entity({ name: 'translation' })
export class Translation {
    @t.PrimaryGeneratedColumn()
    id: number;

    @t.ManyToOne(() => I18n)
    @t.JoinColumn()
    i18n: I18n;

    @t.Column({ type: 'text' })
    text: string;

    @t.Column({ type: 'text' })
    localeCode: string;

    @t.ManyToOne(() => Locale)
    @t.JoinColumn({ name: 'localeCode' })
    locale: Locale;

    public static builder(): TranslationBuilder {
        return new TranslationBuilder();
    }
}

export class TranslationBuilder {
    private translation = new Translation();
    private text: string | null = null;
    private locale: Locale | null = null;

    public setId(id: number): TranslationBuilder {
        this.translation.id = id;
        return this;
    }

    public setText(text: string): TranslationBuilder {
        this.text = text;
        return this;
    }

    public setLocale(locale: Locale): TranslationBuilder {
        this.locale = locale;
        return this;
    }

    public build(): Translation {
        if (!this.text) {
            throw new Error('Text is required');
        }
        if (!this.locale) {
            throw new Error('Locale is required');
        }
        this.translation.text = this.text;
        this.translation.locale = this.locale;
        return this.translation;
    }
}

@t.Entity({ name: 'i18n' })
export class I18n {
    @t.PrimaryGeneratedColumn()
    id: number;

    @t.OneToMany(() => Translation, (translation) => translation.i18n)
    translations: Translation[];

    public static builder(): I18nBuilder {
        return new I18nBuilder();
    }
}

export class I18nBuilder {
    private id: number | null = null;
    private translations: Translation[] | null = null;

    public set(locale: Locale, text: string): I18nBuilder {
        if (!this.translations) {
            this.translations = [];
        }
        this.translations.push(Translation.builder().setLocale(locale).setText(text).build());
        return this;
    }

    public setId(id: number): I18nBuilder {
        this.id = id;
        return this;
    }

    public setTranslations(translations: Translation[]): I18nBuilder {
        this.translations = translations;
        return this;
    }

    public build(): I18n {
        if (!this.translations) {
            throw new Error('Translations are required');
        }
        const i18n = new I18n();
        if (this.id) {
            i18n.id = this.id;
        }
        i18n.translations = this.translations;
        return i18n;
    }
}
