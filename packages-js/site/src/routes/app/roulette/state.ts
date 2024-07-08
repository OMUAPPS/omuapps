export type State =
    | IdleState
    | RecruitingState
    | RecruitingEndState
    | SpinStartState
    | SpinningState
    | SpinResultState;

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

export type SpinResult = {
    entry: RouletteEntry;
};

export type SpinStartState = {
    type: 'spin-start';
};

export type SpinningState = {
    type: 'spinning';
    result: SpinResult;
    start: number;
    duration: number;
};

export type SpinResultState = {
    type: 'spin-result';
    result: SpinResult;
};
