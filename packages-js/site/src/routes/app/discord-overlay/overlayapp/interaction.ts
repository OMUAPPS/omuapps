// interaction.ts
import type { Input } from '$lib/components/canvas/pipeline.js';
import type { AppRenderer } from './app-renderer.js';

export class InteractionManager {
    constructor(
        private app: AppRenderer,
    ) {}

    handleInput(input: Input) {
        for (const event of input) {
            this.app.objectManager.handleInput(event);
        }
    }
}
