import type { Component } from 'svelte';

export type TypedComponent<Props extends Record<string, unknown> = Record<string, unknown>> =
    Component<Props, object, ''>;

export interface PropedComponent<Props extends Record<string, unknown> = Record<string, unknown>> {
    component: TypedComponent<Props>;
    props: Props;
}
