export type RouletteState =
    | IdleState
    | RecruitingState
    | RecruitingEndState
    | SpinStartState
    | SpinningState
    | SpinResultState;

import type { MessageJson } from '@omujs/chat/models';

export type RouletteItem = {
    id: string;
    name: string;
    image?: string;
    message?: MessageJson;
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

export type SpinStartState = {
    type: 'spin-start';
};

export type SpinningState = {
    type: 'spinning';
    result: RouletteItem;
    random: number;
    start: number;
    duration: number;
};

export type SpinResultState = {
    type: 'spin-result';
    result: RouletteItem;
    random: number;
};
