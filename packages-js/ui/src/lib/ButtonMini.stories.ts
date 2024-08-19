import type { Meta, StoryObj } from '@storybook/svelte';
import ButtonMiniStory from './ButtonMiniStory.svelte';

const meta = {
    title: 'Components/ButtonMini',
    component: ButtonMiniStory,
    tags: ['autodocs'],
    argTypes: {
        text: { control: 'text' },
        icon: { control: 'text' },
    },
} satisfies Meta<ButtonMiniStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        text: 'This is a button icon',
        icon: 'close',
    },
};
