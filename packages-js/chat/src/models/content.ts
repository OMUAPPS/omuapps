import { JsonType } from '@omujs/omu/serialize';

export interface ComponentType<T extends string, D extends JsonType = JsonType> {
    readonly type: T;
    readonly data: D;
};

export type Root = ComponentType<'root', readonly Component[]>;

export type Text = ComponentType<'text', string>;

export type Image = ComponentType<'image', {
    readonly url: string;
    readonly id: string;
    readonly name?: string;
}>;

export type Asset = ComponentType<'asset', {
    readonly id: string;
}>;

export type Link = ComponentType<'link', {
    readonly url: string;
    readonly children: readonly Component[];
}>;

export type System = ComponentType<'system', readonly Component[]>;

export type Component =
                    | Root
                    | Text
                    | Image
                    | Asset
                    | Link
                    | System;

export function children(component: Component): readonly Component[] {
    switch (component.type) {
        case 'root': return component.data;
        case 'system': return component.data;
        case 'link': return component.data.children;
        case 'text': return [];
        case 'image': return [];
        case 'asset': return [];
    }
}

export function setChildren(component: Component, children: readonly Component[]): Component {
    switch (component.type) {
        case 'root': return { ...component, data: children };
        case 'system': return { ...component, data: children };
        case 'link': return { ...component, data: { ...component.data, children } };
        default: return component;
    }
}

export function *walk(component: Component): Iterable<Component> {
    const queue = [component];
    while (queue.length > 0) {
        const component = queue.pop();
        if (!component) return;
        yield component;
        queue.push(...children(component).slice().reverse());
    }
}

export function format(component: Component): string {
    return [...walk(component)]
        .filter(it => it.type === 'text')
        .map(it => it.data).join('');
}

export function transform(component: Component, fn: (component: Component) => Component): Component {
    const newChildren = children(component).map(child => transform(child, fn));
    const newComponent = setChildren(component, newChildren);
    return fn(newComponent);
}
