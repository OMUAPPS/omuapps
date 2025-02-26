export type Value = {
    type: 'void',
} | {
    type: 'expression',
    value: Expression,
} | {
    type: 'variable',
    name: string,
} | {
    type: 'attribute',
    value: Value,
    name: Value,
} | {
    type: 'function',
    value: Function,
} | {
    type: 'object',
    value: Record<string, Value>,
} | {
    type: 'number',
    value: number,
} | {
    type: 'string',
    value: string,
} | {
    type: 'timer',
    value: Timer,
} | Invoke;

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
    attribute: (value: Value, name: Value): Value => ({
        type: 'attribute',
        value,
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
    object: (value: Record<string, Value>): Value => ({
        type: 'object',
        value,
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

export type Invoke = {
    type: 'invoke',
    function: Value,
    args: Value[],
}

export type Command = {
    type: 'return',
    value: Value,
} | {
    type: 'assign',
    variable: Value,
    value: Value,
} | {
    type: 'assign-attribute',
    object: Value,
    name: string,
    value: Value,
} | {
    type: 'throw',
    value: Value,
} | Invoke;

export const command = {
    return: (value: Value): Command => ({
        type: 'return',
        value,
    }),
    assign: (variable: Value, value: Value): Command => ({
        type: 'assign',
        variable,
        value,
    }),
    invoke: (func: Value, ...args: Value[]): Invoke => ({
        type: 'invoke',
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
    init: (): Context => ({
        variables: {},
        callstack: [],
        index: 0,
    }),
}

export function evaluateValue(context: Context, value: Value): Value {
    switch (value.type) {
        case 'expression':
            return executeExpression(context, value.value);
        case 'invoke': {
            const func = evaluateValue(context, value.function);
            assertValue(context, func, 'function')
            const args = value.args.map((arg) => evaluateValue(context, arg));
            return func.value.invoke(args);
        }
        case 'variable': {
            const variable = context.variables[value.name];
            if (variable === undefined) {
                throw new ScriptError(`Variable not found: ${value.name}`, { callstack: context.callstack, index: context.index });
            }
            return variable;
        }
        case 'attribute': {
            const object = evaluateValue(context, value.value);
            assertValue(context, object, 'object');
            const name = evaluateValue(context, value.name);
            assertValue(context, name, 'string');
            const attribute = object.value[name.value];
            if (attribute === undefined) {
                throw new ScriptError(`Attribute not found: ${name.value}`, { callstack: context.callstack, index: context.index });
            }
            return attribute;
        }
        case 'function':
        case 'object':
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
            case 'assign': {
                const name = evaluateValue(context, command.variable);
                assertValue(context, name, 'string')
                context.variables[name.value] = evaluateValue(context, command.value);
                break;
            }
            case 'assign-attribute': {
                const object = evaluateValue(context, command.object);
                assertValue(context, object, 'object')
                object.value[command.name] = evaluateValue(context, command.value);
                break;
            }
            case 'invoke': {
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
