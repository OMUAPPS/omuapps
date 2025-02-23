import type { BehaviorFunction, BehaviorHandler } from '../behavior.js';
import { copy } from '../helper.js';

export type Action = {
    on: Partial<{
        click: {
            type: string,
            body: string,
        },
    }>
}

export function createAction(options: { on: Action['on'] }): Action {
    const { on } = options;
    return {
        on: copy(on),
    };
}

export class ActionHandler implements BehaviorHandler<'action'> {
    handleClick: BehaviorFunction<'action', { x: number; y: number; }> = () => {
        
    };
};
