import type { Meta, StoryObj } from '@storybook/svelte';
import LinkableText from './LinkableText.svelte';

// More on how to set up stories at: https://storybook.js.org/docs/svelte/writing-stories/introduction
const meta = {
    title: 'Components/LinkableText',
    component: LinkableText,
    tags: ['autodocs'],
    argTypes: {
        text: { control: 'text' },
    },
} satisfies Meta<LinkableText>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/svelte/writing-stories/args
export const LinkableTextStory: Story = {
    args: {
        text: "This is a linkable text. It can contain links like this one: https://example.com",
    },
};
