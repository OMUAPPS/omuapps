import type { Meta, StoryObj } from '@storybook/svelte';
import RelativeDate from './RelativeDate.svelte';

const meta = {
    title: 'Components/Date',
    component: RelativeDate,
    tags: ['autodocs'],
    argTypes: {
        date: { control: 'date' },
    },
} satisfies Meta<RelativeDate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Now: Story = {
    args: {
        date: new Date(),
    },
};
export const SecondsAgo: Story = {
    args: {
        date: new Date(Date.now() - 1000),
    },
};

export const SecondsFromNow: Story = {
    args: {
        date: new Date(Date.now() + 1000),
    },
};

export const MinutesAgo: Story = {
    args: {
        date: new Date(Date.now() - 1000 * 60),
    },
};

export const MinutesFromNow: Story = {
    args: {
        date: new Date(Date.now() + 1000 * 60),
    },
};

export const HoursAgo: Story = {
    args: {
        date: new Date(Date.now() - 1000 * 60 * 60),
    },
};

export const HoursFromNow: Story = {
    args: {
        date: new Date(Date.now() + 1000 * 60 * 60),
    },
};

export const DaysAgo: Story = {
    args: {
        date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
};

export const DaysFromNow: Story = {
    args: {
        date: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
};

export const WeeksAgo: Story = {
    args: {
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    },
};

export const WeeksFromNow: Story = {
    args: {
        date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
};

export const MonthsAgo: Story = {
    args: {
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    },
};

export const MonthsFromNow: Story = {
    args: {
        date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
};

export const YearsAgo: Story = {
    args: {
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
    },
};

export const YearsFromNow: Story = {
    args: {
        date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
};
