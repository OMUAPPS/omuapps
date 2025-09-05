import { copy } from '../../game/helper.js';
import type { KitchenContext } from '../../kitchen/kitchen.js';
import { getGame } from '../../omucafe-app.js';
import { builder, executeExpression, type Script } from '../../script/script.js';
import type { BehaviorAction, BehaviorHandler, ClickAction } from '../behavior.js';
import type { ItemState } from '../item-state.js';

export type Action = {
    on: Partial<{
        click: string,
        clickChild: string,
        dropChild: string,
    }>
};

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
    async initialize?(): Promise<void> {
    }

    collectActionsHovered(action: BehaviorAction<'action'>, args: { held: ItemState | null; actions: ClickAction[]; }): Promise<void> | void {
        const { item, context, behavior: { on } } = action;
        const type = args.held ? 'dropChild' : 'click';
        const scriptId = on[type];
        if (!scriptId) return;
        const config = context.config;
        const script = config.scripts[scriptId];
        if (!script) {
            console.error(`Script not found: ${scriptId}`);
            return;
        }
        args.actions.push({
            name: script.name,
            item,
            priority: 40,
            callback: () => {
                execute(context, script, {
                    type,
                    item: item.id,
                    held: context.held,
                    hovering: context.hovering,
                });
            },
        });
    }

    collectActionsParent(action: BehaviorAction<'action'>, args: { child: ItemState; held: ItemState | null; actions: ClickAction[]; }): Promise<void> | void {
        const { item, context, behavior: { on } } = action;
        const type = 'clickChild';
        const scriptId = on[type];
        if (!scriptId) return;
        const config = context.config;
        const script = config.scripts[scriptId];
        if (!script) {
            console.error(`Script not found: ${scriptId}`);
            return;
        }
        args.actions.push({
            name: script.name,
            item: args.child,
            priority: 20,
            callback: () => {
                execute(context, script, {
                    type,
                    item: item.id,
                    held: args.held?.id || null,
                    child: args.child?.id || null,
                    hovering: context.hovering,
                });
            },
        });
    }
};
