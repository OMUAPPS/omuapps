export type VString = {
    type: 'string',
    value: string,
}
export type VTimer = {
    type: 'timer',
    value: Timer,
};
type VNumber = {
    type: 'number';
    value: number;
};

type VObject = {
    type: 'object';
    value: Record<string, Value>;
};

type VFunction = {
    type: 'function';
    value: TypedFunction;
};

type VAttribute = {
    type: 'attribute';
    value: Value;
    name: Value;
};

type VVariable = {
    type: 'variable';
    name: string;
};

type VExpression = {
    type: 'expression';
    value: Expression;
};

type VVoid = {
    type: 'void';
};

export type Value = VVoid | VExpression | VVariable | VAttribute | VFunction | VObject | VNumber | VString | VTimer | VInvoke;

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
    function: (value: TypedFunction): Value => ({
        type: 'function',
        value,
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


export type Argument<ValueType extends Value = Value> = {
    name: string,
    type: ValueType['type'],
    optional?: boolean,
}

export type ArgumentList<Args extends Value[]> = {
    [K in keyof Args]: Args[K] extends Value ? Argument<Args[K]> : never
}[number][] | never[];

export type TypedFunction<Args extends Value[] = Value[]> = {
    name: string,
    args: ArgumentList<Args>,
    invoke: (ctx: ScriptContext, args: Args) => Value,
}

export type Timer = {
    start: number,
}

export type VInvoke = {
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
} | VInvoke;

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
    invoke: (func: Value, ...args: Value[]): VInvoke => ({
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

export type ScriptContext = {
    variables: Record<string, Value>,
    callstack: Expression[],
    index: number,
    copy: () => ScriptContext,
}

const context = {
    init: (): ScriptContext => ({
        variables: {},
        callstack: [],
        index: 0,
        copy: function () {
            return {
                variables: { ...this.variables },
                callstack: [...this.callstack],
                index: this.index,
                copy: this.copy,
            }
        },
    }),
}

export function evaluateValue(ctx: ScriptContext, value: Value): Value {
    switch (value.type) {
        case 'expression':
            return executeExpression(ctx, value.value);
        case 'invoke': {
            const func = evaluateValue(ctx, value.function);
            assertValue(ctx, func, 'function')
            const args = value.args.map((arg) => evaluateValue(ctx, arg));
            return func.value.invoke(ctx, args);
        }
        case 'variable': {
            const variable = ctx.variables[value.name];
            if (variable === undefined) {
                throw new ScriptError(`Variable not found: ${value.name}`, { callstack: ctx.callstack, index: ctx.index });
            }
            return variable;
        }
        case 'attribute': {
            const object = evaluateValue(ctx, value.value);
            assertValue(ctx, object, 'object');
            const name = evaluateValue(ctx, value.name);
            assertValue(ctx, name, 'string');
            const attribute = object.value[name.value];
            if (attribute === undefined) {
                throw new ScriptError(`Attribute not found: ${name.value}`, { callstack: ctx.callstack, index: ctx.index });
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

export function assertValue<T extends Value['type']>(context: ScriptContext, value: Value, type: T): asserts value is Extract<Value, { type: T }> {
    if (value.type !== type) {
        const { callstack, index } = context;
        throw new ScriptError(`Expected ${type} but got ${value.type}`, { callstack, index });
    }
}

export function executeExpression(ctx: ScriptContext, expression: Expression): Value {
    ctx.callstack.push(expression);
    for (const [index, command] of expression.commands.entries()) {
        ctx.index = index;
        switch (command.type) {
            case 'return': {
                return evaluateValue(ctx, command.value);
            }
            case 'assign': {
                const name = evaluateValue(ctx, command.variable);
                assertValue(ctx, name, 'string')
                ctx.variables[name.value] = evaluateValue(ctx, command.value);
                break;
            }
            case 'assign-attribute': {
                const object = evaluateValue(ctx, command.object);
                assertValue(ctx, object, 'object')
                object.value[command.name] = evaluateValue(ctx, command.value);
                break;
            }
            case 'invoke': {
                const func = evaluateValue(ctx, command.function);
                assertValue(ctx, func, 'function')
                const args = command.args.map((arg) => evaluateValue(ctx, arg));
                if (func.value.args.length !== args.length) {
                    throw new ScriptError(`Expected ${func.value.args.length} arguments but got ${args.length}`, { callstack: ctx.callstack, index });
                }
                for (let i = 0; i < func.value.args.length; i++) {
                    const arg = func.value.args[i];
                    const argValue = args[i];
                    if (arg.optional && argValue.type === 'void') {
                        continue;
                    }
                    if (argValue.type !== arg.type) {
                        throw new ScriptError(`Expected argument ${i} to be ${arg.type} but got ${argValue.type}`, { callstack: ctx.callstack, index });
                    }
                }
                func.value.invoke(ctx, args);
                break;
            }
            case 'throw': {
                const value = evaluateValue(ctx, command.value);
                throw new ScriptError(`Thrown value: ${JSON.stringify(value)}`, { callstack: ctx.callstack, index });
            }
            default: {
                const { callstack, index } = ctx;
                const command = expression.commands[index];
                throw new ScriptError(`Unexpected command type: ${command.type}`, { callstack, index });
            }
        }
    }
    ctx.callstack.pop();
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

export class Globals {
    private readonly functions: Record<string, TypedFunction<any>> = {};
    
    public registerFunction<Args extends Value[]>(name: string, args: ArgumentList<Args>, invoke: (ctx: ScriptContext, args: Args) => Value): TypedFunction<Args> {
        const func: TypedFunction<Args> =  {
            name,
            args,
            invoke,
        };
        this.functions[name] = func;
        return func;
    }

    public newContext(): ScriptContext {
        const ctx = context.init();
        for (const key in this.functions) {
            const func = this.functions[key];
            ctx.variables[func.name] = value.function(func);
        }
        return ctx;
    }
}
