import type { Meta, StoryObj } from '@storybook/svelte';
import ComboboxStory from './ComboboxStory.svelte';

const meta = {
    title: 'Components/Combobox',
    component: ComboboxStory,
    tags: ['autodocs'],
    argTypes: {
        options: {
            control: 'object',
        },
        defaultValue: {
            control: 'text',
        },
    },
} satisfies Meta<ComboboxStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
    args: {
        options: {
            a: { value: 'a', label: 'A' },
            b: { value: 'b', label: 'B' },
            c: { value: 'c', label: 'C' },
        },
    },
};
