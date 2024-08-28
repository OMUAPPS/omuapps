import { models } from '@omujs/chat';
import type { Meta, StoryObj } from '@storybook/svelte';
import Gift from './Gift.svelte';

const meta = {
    title: 'Components/Gift',
    component: Gift,
    tags: ['autodocs'],
    argTypes: {},
} satisfies Meta<Gift>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        gift: new models.Gift({
            id: 'test',
            name: 'Test',
            amount: 100,
            isPaid: false,
            imageUrl: 'https://via.placeholder.com/150',
        }),
    },
};

export const NoImage: Story = {
    args: {
        gift: new models.Gift({
            id: 'test',
            name: 'Test',
            amount: 100,
            isPaid: false,
        }),
    },
};

export const Paid: Story = {
    args: {
        gift: new models.Gift({
            id: 'test',
            name: 'Test',
            amount: 100,
            isPaid: true,
            imageUrl: 'https://via.placeholder.com/150',
        }),
    },
};

export const NoAmount: Story = {
    args: {
        gift: new models.Gift({
            id: 'test',
            name: 'Test',
            isPaid: false,
            amount: 0,
            imageUrl: 'https://via.placeholder.com/150',
        }),
    },
};
