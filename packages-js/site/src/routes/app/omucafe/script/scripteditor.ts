import type { Value } from './script.js';

export const SCRIPT_EDITOR_CONTEXT = Symbol('editor');

export type ValueEdit = {
    value: Value,
    setter: (value: Value) => unknown,
    cancel: () => unknown,
};

export interface ScriptEditorContext {
    editValue(edit: ValueEdit): void,
}
