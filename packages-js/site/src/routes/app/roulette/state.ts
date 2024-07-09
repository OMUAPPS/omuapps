export type State =
    | IdleState
    | RecruitingState
    | RecruitingEndState
    | SpinStartState
    | SpinningState
    | SpinResultState;

import type { models } from '@omujs/chat';

export type RouletteItem = {
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
    entry: RouletteItem;
};

export type SpinStartState = {
    type: 'spin-start';
};

export type SpinningState = {
    type: 'spinning';
    result: SpinResult;
    random: number;
    start: number;
    duration: number;
};

export type SpinResultState = {
    type: 'spin-result';
    result: SpinResult;
    random: number;
};
