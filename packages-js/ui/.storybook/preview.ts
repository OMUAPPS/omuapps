import type { Preview } from '@storybook/svelte';
import { decorators } from '../src/lib/decorators';

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
    decorators: decorators as never,
};

export default preview;
