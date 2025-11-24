import type { Meta, StoryObj } from '@storybook/svelte';
import VirtualListStory from './VirtualListStory.svelte';

// More on how to set up stories at: https://storybook.js.org/docs/svelte/writing-stories/introduction
const meta = {
    title: 'Components/VirtualList',
    component: VirtualListStory,
    tags: ['autodocs'],
    argTypes: {
        length: { control: 'number' },
    },
} satisfies Meta<VirtualListStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/svelte/writing-stories/args
export const Example: Story = {
    args: {
        length: 100,
    },
};
