import type { Meta, StoryObj } from '@storybook/svelte';
import TooltipView from './TooltipStory.svelte';

// More on how to set up stories at: https://storybook.js.org/docs/svelte/writing-stories/introduction
const meta = {
    title: 'Components/Tooltip',
    component: TooltipView,
    tags: ['autodocs'],
    argTypes: {
        text: { control: 'text' },
        image: { control: 'text' },
    },
} satisfies Meta<TooltipView>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/svelte/writing-stories/args
export const Example: Story = {
    args: {
        text: 'Hello, World!',
        image: 'https://via.placeholder.com/150',
    },
};
