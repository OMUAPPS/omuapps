import { Models } from '@omujs/chat';
import type { Meta, StoryObj } from '@storybook/svelte';
import Role from './Role.svelte';

const meta = {
    title: 'Components/Role',
    component: Role,
    tags: ['autodocs'],
    argTypes: {},
} satisfies Meta<Role>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Icon: Story = {
    args: {
        role: new Models.Role({
            id: 'test',
            name: 'Test',
            isOwner: true,
            isModerator: true,
            color: 'red',
            iconUrl: 'https://via.placeholder.com/150',
        }),
    },
};

export const NoIcon: Story = {
    args: {
        role: new Models.Role({
            id: 'test',
            name: 'Test',
            color: 'red',
            isOwner: false,
            isModerator: false,
        }),
    },
};
