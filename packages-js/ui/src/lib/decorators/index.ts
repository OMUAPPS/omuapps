import ClientDecorator from './ClientDecorator.svelte';
import FontDecorator from './FontDecorator.svelte';
import ThemeDecorator from './ThemeDecorator.svelte';
import TranslateDecorator from './TranslateDecorator.svelte';

export const decorators = [
    () => FontDecorator,
    () => ThemeDecorator,
    () => TranslateDecorator,
    () => ClientDecorator,
];
