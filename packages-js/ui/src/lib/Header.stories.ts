import type { Meta, StoryObj } from '@storybook/svelte';
import Header from './Header.svelte';

const meta = {
    title: 'Components/Header',
    component: Header,
    tags: ['autodocs'],
    argTypes: {
        title: { control: 'text' },
        icon: { control: 'text' },
    },
} satisfies Meta<Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Title',
        icon: 'ti ti-home',
    },
};

export const WithSubtitle: Story = {
    args: {
        title: 'Title',
        subtitle: 'Subtitle',
        icon: "ti-home",
    },
};
