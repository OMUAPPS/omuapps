import type { Meta, StoryObj } from '@storybook/svelte';
import ButtonStory from './ButtonStory.svelte';

const meta = {
    title: 'Components/Button',
    component: ButtonStory,
    tags: ['autodocs'],
    argTypes: {
    },
} satisfies Meta<ButtonStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
    },
};
