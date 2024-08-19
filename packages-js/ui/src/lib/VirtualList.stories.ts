import type { Meta, StoryObj } from '@storybook/svelte';
import VirtualListView from './VirtualListStory.svelte';

// More on how to set up stories at: https://storybook.js.org/docs/svelte/writing-stories/introduction
const meta = {
    title: 'Components/VirtualList',
    component: VirtualListView,
    tags: ['autodocs'],
    argTypes: {
        length: { control: 'number' },
    },
} satisfies Meta<VirtualListView>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/svelte/writing-stories/args
export const Example: Story = {
    args: {
        length: 100,
    },
};
