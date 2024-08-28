import { content } from '@omujs/chat/models/index.js';
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
        component: new content.Root([
            new content.Text('Hello, world!'),
            new content.Image(
                'https://via.placeholder.com/150',
                'placeholder-150',
                'This is a placeholder',
            ),
            new content.System([
                new content.Text('This is a system message'),
                new content.Image(
                    'https://via.placeholder.com/150',
                    'placeholder-150',
                    'This is a placeholder',
                ),
            ]),
            new content.Link('https://example.com', [
                new content.Text('This is a link'),
            ]),
        ]),
    },
};
