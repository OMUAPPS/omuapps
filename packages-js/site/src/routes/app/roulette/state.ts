export type State = IdleState | RecruitingState | RecruitingEndState | SpinningState;

import type { models } from '@omujs/chat';

export type RouletteEntry = {
    id: string;
    name: string;
    image?: string;
    message?: models.Message;
};

export type IdleState = {
    type: 'idle';
};

export type RecruitingState = {
    type: 'recruiting';
};

export type RecruitingEndState = {
    type: 'recruiting-end';
};

export type SpinningState = {
    type: 'spinning';
};

export type SpinResult = {
    entry: RouletteEntry;
};
