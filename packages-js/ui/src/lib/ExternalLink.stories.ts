import type { Meta, StoryObj } from '@storybook/svelte';
import ExternalLink from './ExternalLink.svelte';

const meta = {
    title: 'Components/ExternalLink',
    component: ExternalLink,
    tags: ['autodocs'],
    argTypes: {
        href: {
            control: {
                type: 'text',
            },
        },
        title: {
            control: {
                type: 'text',
            },
        },
    },
} satisfies Meta<ExternalLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
    args: {
        href: 'https://example.com',
        title: 'Example',
    },
};
