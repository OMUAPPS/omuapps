import { Timer } from '$lib/timer';
import { generateUid } from '../core/helper';

interface DataObj {
    [key: string]: Data;
}
type Data = undefined | string | number | boolean | DataObj;

interface IInt {
    type: 'int';
}

interface ISetVar {
    type: 'set_var';
    obj: string;
    target: string;
    var: string;
}

interface ISetConst {
    type: 'set_const';
    obj: string;
    target: string;
    data: Data;
}

interface IJumpBy {
    type: 'jump_by';
    delta: number;
    cond?: string;
}

interface IJumpTo {
    type: 'jump_to';
    index: number;
    cond?: string;
}

interface IConst {
    type: 'const';
    name: string;
    data: Data;
}

interface ICall {
    type: 'call';
    store?: string;
    func: string;
    arg: string;
}

interface ICallAPI {
    type: 'api';
    store?: string;
    endpoint: string;
    arg?: string;
}

interface IRet {
    type: 'ret';
    var?: string;
}

export type Instruction = IInt | ISetVar | ISetConst | IJumpBy | IRet | IJumpTo | IConst | ICall | ICallAPI;

export interface Func {
    insts: Instruction[];
}

export interface Task {
    id: string;
    state: 'running' | 'idle';
    func: string;
    index: number;
    vars: Record<string, Data>;
    ret?: {
        task: string;
        store?: string;
    };
}

export interface ScriptEnvironment {
    funcs: Record<string, Func>;
    tasks: Record<string, Task>;
}

export interface ScriptAPIEndpoint {
    (ctx: ScriptContext, task: Task, data: Data): Data;
}

export interface ScriptAPI {
    endpoints: Record<string, ScriptAPIEndpoint>;
}

export interface ScriptContext {
    env: ScriptEnvironment;
    api: ScriptAPI;
}

function runTask(ctx: ScriptContext, task: Task) {
    const { env } = ctx;
    const { ret } = task;
    const func = env.funcs[task.func];
    if (task.index >= func.insts.length) {
        if (ret) {
            const retTask = env.tasks[ret.task];
            retTask.state = 'running';
            if (ret.store) {
                retTask.vars[ret.store] = undefined;
            }
        }
        delete env.tasks[task.id];
        return;
    }
    let counter = 0;
    for (; task.index < func.insts.length && task.state === 'running';) {
        counter++;
        if (counter > 100) {
            task.index ++;
            return;
        }
        const instruction = func.insts[task.index];
        switch (instruction.type) {
            case 'const': {
                task.vars[instruction.name] = instruction.data;
                break;
            }
            case 'set_const': {
                const obj = task.vars[instruction.obj];
                if (typeof obj !== 'object') {
                    continue;
                }
                obj[instruction.target] = instruction.data;
                break;
            }
            case 'set_var': {
                const obj = task.vars[instruction.obj];
                const value = task.vars[instruction.var];
                if (typeof obj !== 'object') {
                    continue;
                }
                obj[instruction.target] = value;
                break;
            }
            case 'call': {
                const callId = generateUid();
                const arg = task.vars[instruction.arg];
                env.tasks[callId] = {
                    id: callId,
                    func: instruction.func,
                    index: 0,
                    state: 'running',
                    vars: { arg },
                    ret: {
                        task: task.id,
                        store: instruction.store,
                    },
                };
                task.state = 'idle';
                task.index++;
                return;
            }
            case 'api': {
                const endpoint = ctx.api.endpoints[instruction.endpoint];
                const arg = instruction.arg && task.vars[instruction.arg];
                const result = endpoint(ctx, task, arg);
                if (instruction.store) {
                    task.vars[instruction.store] = result;
                }
                break;
            }
            case 'jump_by': {
                const condition = !instruction.cond || task.vars[instruction.cond];
                if (condition) {
                    task.index += instruction.delta + 1;
                }
                continue;
            }
            case 'jump_to': {
                const condition = !instruction.cond || task.vars[instruction.cond];
                if (condition) {
                    task.index = instruction.index;
                }
                continue;
            }
            case 'int': {
                task.index ++;
                return;
            }
            case 'ret': {
                const value = instruction.var && task.vars[instruction.var];
                if (ret) {
                    const retTask = env.tasks[ret.task];
                    retTask.state = 'running';
                    if (ret.store) {
                        retTask.vars[ret.store] = value;
                    }
                }
                delete env.tasks[task.id];
                return;
            }
        }
        task.index++;
    }
}

export function process(ctx: ScriptContext) {
    const tasks = Object.values(ctx.env.tasks);
    for (const task of tasks) {
        if (task.state === 'running') {
            runTask(ctx, task);
        }
    }
}

export function createTask(ctx: ScriptContext, funcId: string) {
    const id = generateUid();
    ctx.env.tasks[id] = {
        func: funcId,
        id,
        index: 0,
        state: 'running',
        vars: {},
    };
}

export function testScripting() {
    const HELLO_WORLD: ScriptEnvironment = {
        funcs: {
            'main': {
                insts: [
                    {
                        type: 'const',
                        name: 'arg',
                        data: 'Starting...',
                    },
                    {
                        type: 'api',
                        endpoint: 'debug:log',
                        arg: 'arg',
                    },
                    {
                        type: 'const',
                        name: 'arg',
                        data: Timer.now() + 3000,
                    },
                    {
                        type: 'call',
                        func: 'std:sleep',
                        arg: 'arg',
                    },
                    {
                        type: 'const',
                        name: 'arg',
                        data: 'Ended!',
                    },
                    {
                        type: 'api',
                        endpoint: 'debug:log',
                        arg: 'arg',
                    },
                    {
                        type: 'ret',
                    },
                ],
            },
            'std:sleep': {
                // target: int
                insts: [
                    {
                        type: 'const',
                        name: 'compare',
                        data: {},
                    },
                    {
                        type: 'api',
                        endpoint: 'time:now',
                        store: 'time',
                    },
                    {
                        type: 'set_var',
                        obj: 'compare',
                        target: 'left',
                        var: 'time',
                    },
                    {
                        type: 'set_var',
                        obj: 'compare',
                        target: 'right',
                        var: 'arg',
                    },
                    {
                        type: 'api',
                        endpoint: 'int:gt',
                        store: 'passed',
                        arg: 'compare',
                    },
                    {
                        type: 'jump_by',
                        delta: 2,
                        cond: 'passed',
                    },
                    {
                        type: 'int',
                    },
                    {
                        type: 'jump_to',
                        index: 1,
                    },
                    {
                        type: 'ret',
                    },
                ],
            },
        },
        tasks: {
            '0': {
                id: '0',
                func: 'main',
                index: 0,
                state: 'running',
                vars: {},
            },
        },
    };

    const API: ScriptAPI = {
        endpoints: {
            'debug:log': (ctx: ScriptContext, task: Task, data: Data) => {
                console.log(data);
            },
            'int:gt': (ctx: ScriptContext, task: Task, data: Data) => {
                if (typeof data !== 'object') {
                    return false;
                }
                const { left, right } = data;
                if (typeof left !== 'number') return false;
                if (typeof right !== 'number') return false;
                return left > right;
            },
            'time:now': () => {
                return Timer.now();
            },
        },
    };

    setInterval(() => {
        process({
            api: API,
            env: HELLO_WORLD,
        });
    }, 50);
}
