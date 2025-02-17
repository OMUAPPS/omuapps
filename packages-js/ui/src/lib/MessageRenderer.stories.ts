import { Author } from '@omujs/chat/models/author.js';
import { Text } from '@omujs/chat/models/content.js';
import { Gift } from '@omujs/chat/models/gift.js';
import { Paid } from '@omujs/chat/models/paid.js';
import type { Meta, StoryObj } from '@storybook/svelte';
import MessageRenderer from './MessageRenderer.svelte';

const meta = {
    title: 'Components/MessageRenderer',
    component: MessageRenderer,
    tags: ['autodocs'],
} satisfies Meta<MessageRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
    args: {
        content: Text.of('Hello, world!'),
        author: Author.fromJson({
            id: 'test:test/test',
            provider_id: 'test:test/test',
            name: 'Test User',
            avatar_url: 'https://baconmockup.com/300/300',
            roles: [
                {
                    name: 'Owner',
                    is_owner: true,
                    is_moderator: true,
                    icon_url: 'https://baconmockup.com/300/300',
                    color: 'red',
                },
            ],
            metadata: {
                avatar_url: 'https://baconmockup.com/300/300',
                description: 'Test User',
                links: ['https://example.com'],
                screen_id: 'test',
                url: 'https://example.com',
            }
        }),
        createdAt: new Date(),
        gifts: [
            Gift.fromJson({
                id: 'test:test/test',
                name: 'Test User',
                image_url: 'https://baconmockup.com/300/300',
                amount: 100,
                is_paid: true,
            }),
        ],
        paid: Paid.fromJson({
            amount: 100,
            currency: 'USD',
        }),
    },
};


export const NoAuthor: Story = {
    args: {
        content: Text.of('Hello, world!'),
        createdAt: new Date(),
        gifts: [
            Gift.fromJson({
                id: 'test:test/test',
                name: 'Test User',
                image_url: 'https://baconmockup.com/300/300',
                amount: 100,
                is_paid: true,
            }),
        ],
    },
};
