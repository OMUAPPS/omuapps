import { copy } from '../../game/helper.js';
import type { KitchenContext } from '../../game/kitchen.js';
import { getGame } from '../../omucafe-app.js';
import { builder, executeExpression, type Script } from '../../script/script.js';
import type { BehaviorAction, BehaviorFunction, BehaviorHandler } from '../behavior.js';
import type { ItemState } from '../item-state.js';

export type Action = {
    on: Partial<{
        click: string,
        clickChild: string,
        dropChild: string,
    }>
}

export function createAction(options: { on: Action['on'] }): Action {
    const { on } = options;
    return {
        on: copy(on),
    };
}

function execute(kitchen: KitchenContext, script: Script, args: Record<string, string | null>) {
    const { ctx, v } = builder;
    const context = getGame().globals.newContext();
    const { variables } = context;
    for (const key in args) {
        const value = args[key];
        if (value === null) {
            variables[key] = v.void();
        } else {
            variables[key] = v.string(value);
        }
    }
    executeExpression(context, script.expression);
}

export class ActionHandler implements BehaviorHandler<'action'> {
    private execute(type: keyof Action['on'], context: KitchenContext, action: BehaviorAction<'action'>, args: Record<string, string | null>) {
        const { item, behavior: { on } } = action;
        if (!on[type]) return;
        const config = context.config;
        const script = config.scripts[on[type]];
        if (!script) {
            console.error(`Script not found: ${on[type]}`);
            return;
        }
        execute(context, script, {
            type,
            item: item.id,
            held: context.held,
            hovering: context.hovering,
            ...args,
        });
    }
    
    handleClick: BehaviorFunction<'action', { x: number; y: number; }> = (context, action) => {
        this.execute('click', context, action, {});
    };

    handleClickChild: BehaviorFunction<'action', { child: ItemState; }> = (context, action, args) => {
        this.execute('clickChild', context, action, {
            child: args.child.id,
        });
    };

    handleDropChild: BehaviorFunction<'action', { child: ItemState; }> = (context, action, args) => {
        this.execute('dropChild', context, action, {
            child: args.child.id,
        });
    };
};
