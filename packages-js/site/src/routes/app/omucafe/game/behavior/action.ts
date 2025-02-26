import type { BehaviorAction, BehaviorFunction, BehaviorHandler } from '../behavior.js';
import { copy } from '../helper.js';
import type { ItemState } from '../item-state.js';
import type { KitchenContext } from '../kitchen.js';
import { assertValue, builder, executeExpression, ScriptError, type Script, type Value } from '../script.js';

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
    const context = ctx.init();
    const { variables } = context;
    for (const key in args) {
        const value = args[key];
        if (value === null) {
            variables[key] = v.void();
        } else {
            variables[key] = v.string(value);
        }
    }
    const functions: Record<string, (args: Value[]) => Value> = {
        create_effect(args: Value[]): Value {
            if (args.length !== 2) throw new ScriptError(`Expected 2 arguments but got ${args.length}`, { callstack: context.callstack, index: context.index });
            const [itemId, effectId] = args;
            assertValue(context, itemId, 'string');
            assertValue(context, effectId, 'string');
            const config = kitchen.getConfig();
            const item = kitchen.items[itemId.value];
            const effect = config.effects[effectId.value];
            item.effects[effect.id] = copy(effect);
            return v.void();
        }
    };
    for (const key in functions) {
        context.variables[key] = v.bind(functions[key]);
    }
    executeExpression(context, script.expression);
}

export class ActionHandler implements BehaviorHandler<'action'> {
    private execute(type: keyof Action['on'], context: KitchenContext, action: BehaviorAction<'action'>) {
        const { item, behavior: { on } } = action;
        if (!on[type]) return;
        const config = context.getConfig();
        const script = config.scripts[on[type]];
        if (!script) return;
        execute(context, script, {
            type,
            item: item.id,
            held: context.held,
            hovering: context.hovering,
        });
    }
    
    handleClick: BehaviorFunction<'action', { x: number; y: number; }> = (context, action, args) => {
        this.execute('click', context, action);
    };

    handleClickChild: BehaviorFunction<'action', { child: ItemState; }> = (context, action, args) => {
        this.execute('clickChild', context, action);
    };

    handleDropChild: BehaviorFunction<'action', { child: ItemState; }> = (context, action, args) => {
        this.execute('dropChild', context, action);
    };
};
