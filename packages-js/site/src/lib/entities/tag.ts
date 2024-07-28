import { Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { I18n } from './i18n.js';

@Entity({ name: 'tag_metadata' })
export class TagMetadata {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => I18n)
    @JoinColumn()
    i18n: I18n;
}

@Entity({ name: 'tag' })
export class Tag {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => TagMetadata)
    @JoinColumn()
    metadata: TagMetadata;
}
