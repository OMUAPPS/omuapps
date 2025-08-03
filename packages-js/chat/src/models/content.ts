import { JsonType } from '@omujs/omu/serializer.js';

export type ComponentType<T extends string, D extends JsonType = JsonType> = {
    type: T;
    data: D;
}

export type Root = ComponentType<'root', Component[]>;

export type Text = ComponentType<'text', string>;

export type Image = ComponentType<'image', {
    url: string;
    id: string;
    name?: string;
}>;

export type Asset = ComponentType<'asset', {
    id: string;
}>;

export type Link = ComponentType<'link', {
    url: string;
    children: Component[];
}>

export type System = ComponentType<'system', Component[]>

export type Component = 
                    | Root
                    | Text
                    | Image
                    | Asset
                    | Link
                    | System;

export function children(component: Component): Component[] {
    switch (component.type) {
        case 'root': return component.data;
        case 'system': return component.data;
        case 'link': return component.data.children;
        case 'text': return [];
        case 'image': return [];
        case 'asset': return [];
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
