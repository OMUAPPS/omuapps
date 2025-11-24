<script lang="ts">
    import { run } from 'svelte/legacy';

    import { type Color, theme } from './stores.js';

    let css = $state('');

    function format(value: Color | number) {
        if (typeof value === 'object') {
            if (value.a !== undefined) {
                return `rgba(${value.r}, ${value.g}, ${value.b}, ${value.a})`;
            }
            return `rgb(${value.r}, ${value.g}, ${value.b})`;
        }
        return `${value}px`;
    }

    run(() => {
        const properties = Object.entries($theme);
        const lines = properties.map(([key, value]) => {
            return `--${key}: ${format(value)};`;
        });
        css = `:root {
            ${lines.join('\n')}
        }`;
    });
</script>

<svelte:element this={'style'}>
    {css}
</svelte:element>
