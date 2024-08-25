export type WorkTimeState = {
    type: 'work';
};

export type BreakTimeState = {
    type: 'break';
    start: number;
    scene: string | null;
};

export type BreakTimerState = WorkTimeState | BreakTimeState;
