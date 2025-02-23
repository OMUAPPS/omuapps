export type Value = {
    type: 'void',
} | {
    type: 'expression',
    value: Expression,
} | {
    type: 'variable',
    name: string,
} | {
    type: 'function',
    value: Function,
} | {
    type: 'number',
    value: number,
} | {
    type: 'string',
    value: string,
} | {
    type: 'timer',
    value: Timer,
};

export const value = {
    void: (): Value => ({
        type: 'void',
    }),
    expression: (value: Expression): Value => ({
        type: 'expression',
        value,
    }),
    variable: (name: string): Value => ({
        type: 'variable',
        name,
    }),
    function: (value: Function): Value => ({
        type: 'function',
        value,
    }),
    bind: (invoke: Function['invoke']): Value => ({
        type: 'function',
        value: { invoke },
    }),
    number: (value: number): Value => ({
        type: 'number',
        value,
    }),
    string: (value: string): Value => ({
        type: 'string',
        value,
    }),
    timer: (value: Timer): Value => ({
        type: 'timer',
        value,
    }),
}

export type Function = {
    invoke: (args: Value[]) => Value,
}

export type Timer = {
    start: number,
}

export type Command = {
    type: 'return',
    value: Value,
} | {
    type: 'store',
    variable: Value,
    value: Value,
} | {
    type: 'call',
    function: Value,
    args: Value[],
} | {
    type: 'throw',
    value: Value,
};

export const command = {
    return: (value: Value): Command => ({
        type: 'return',
        value,
    }),
    store: (variable: Value, value: Value): Command => ({
        type: 'store',
        variable,
        value,
    }),
    call: (func: Value, ...args: Value[]): Command => ({
        type: 'call',
        function: func,
        args,
    }),
    throw: (value: Value): Command => ({
        type: 'throw',
        value,
    }),
}

export type Expression = {
    name: string,
    commands: Command[],
}

export const expr = {
    of: (name: string, commands: Command[]): Expression => ({
        name,
        commands,
    }),
}

type Context = {
    variables: Record<string, Value>,
    callstack: Expression[],
    index: number,
}

const context = {
    empty: (): Context => ({
        variables: {},
        callstack: [],
        index: 0,
    }),
}

export function evaluateValue(context: Context, value: Value): Value {
    switch (value.type) {
        case 'expression':
            return executeExpression(context, value.value);
        case 'variable':
            return context.variables[value.name];
        case 'void':
        case 'number':
        case 'string':
        case 'timer':
            return value
        default:
            throw new Error('Unexpected value type');
    }
}

export class ScriptError extends Error {
    constructor(message: string, public readonly info: { callstack: Expression[], index: number }) {
        super(message);
    }
}

export function assertValue<T extends Value['type']>(context: Context, value: Value, type: T): asserts value is Extract<Value, { type: T }> {
    if (value.type !== type) {
        const { callstack, index } = context;
        throw new ScriptError(`Expected ${type} but got ${value.type}`, { callstack, index });
    }
}

export function executeExpression(context: Context, expression: Expression): Value {
    context.callstack.push(expression);
    for (const [index, command] of expression.commands.entries()) {
        context.index = index;
        switch (command.type) {
            case 'return': {
                return evaluateValue(context, command.value);
            }
            case 'store': {
                const name = evaluateValue(context, command.variable);
                assertValue(context, name, 'string')
                context.variables[name.value] = evaluateValue(context, command.value);
                break;
            }
            case 'call': {
                const func = evaluateValue(context, command.function);
                assertValue(context, func, 'function')
                const args = command.args.map((arg) => evaluateValue(context, arg));
                func.value.invoke(args);
                break;
            }
            case 'throw': {
                const value = evaluateValue(context, command.value);
                throw new ScriptError(`Thrown value: ${JSON.stringify(value)}`, { callstack: context.callstack, index });
            }
            default: {
                const { callstack, index } = context;
                const command = expression.commands[index];
                throw new ScriptError(`Unexpected command type: ${command.type}`, { callstack, index });
            }
        }
    }
    context.callstack.pop();
    return value.void();
}

export const builder = {
    v: value,
    c: command,
    e: expr,
    ctx: context,
}

export type Script = {
    name: string,
    expression: Expression,
}
