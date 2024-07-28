import { DataSource } from 'typeorm';
import { I18n, Translation } from './entities/i18n.js';
import { Locale } from './entities/locale.js';
import { Tag, TagMetadata } from './entities/tag.js';

class TypeOrm {
    private static instance: Promise<DataSource> | null = null;

    private constructor() {
        // Private constructor to prevent external instantiation
    }

    public static getDb(): Promise<DataSource> {
        if (!TypeOrm.instance) {
            TypeOrm.instance = new DataSource({
                type: 'postgres',
                host: 'localhost',
                port: 5432,
                username: 'postgres',
                password: 'test',
                database: 'postgres',
                synchronize: true,
                logging: true,
                entities: [Locale, I18n, Translation, TagMetadata, Tag],
                migrations: [],
                subscribers: [],
            })
                .initialize()
                .then((fulfilled) => {
                    console.info('Data Source has been initialized!');
                    return fulfilled;
                })
                .catch((err) => {
                    console.error('Error during Data Source initialization', err);
                    throw err;
                });
        }
        return TypeOrm.instance;
    }
}

export default TypeOrm;
