import type { Meta, StoryObj } from '@storybook/svelte';
import ComponentRenderer from './ComponentRenderer.svelte';

const meta = {
    title: 'Components/ComponentRenderer',
    component: ComponentRenderer,
    tags: ['autodocs'],
    argTypes: {},
} satisfies Meta<ComponentRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
    args: {
        component: {
            type: 'root',
            data: [
                { type: 'text', data: 'Hello, world!' },
                { type: 'image', data: {
                    url: 'https://via.placeholder.com/150',
                    id: 'placeholder-150',
                    name: 'This is a placeholder',
                } },
                { type: 'system', data: [
                    { type: 'text', data: 'This is a system message' },
                    { type: 'image', data: {
                        url: 'https://via.placeholder.com/150',
                        id: 'placeholder-150',
                        name: 'This is a placeholder',
                    } },
                ] },
                {
                    type: 'link',
                    data: {
                        url: 'https://example.com',
                        children: [{ type: 'text', data: 'This is a link' }],
                    },
                },
            ],
        },
    },
};
