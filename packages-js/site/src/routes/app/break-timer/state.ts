export type WorkTimeState = {
    type: 'work';
};

export type BreakTimeState = {
    type: 'break';
    start: number;
};

export type BreakTimerState = WorkTimeState | BreakTimeState;
