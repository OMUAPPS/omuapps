import type { GlContext } from '$lib/components/canvas/glcontext';
import type { Config } from '../discord-overlay-app';
import { createBackLightEffect } from './backlight';
import { createBloomEffect } from './bloom';
import type { Effect } from './effect';
import { createShadowEffect } from './shadow';
import { createSpeechEffect } from './speech';

export class EffectManager {
    private constructor(
        private readonly getConfig: () => Config,
        private readonly shadowEffect: Effect,
        private readonly backlightEffect: Effect,
        private readonly bloomEffect: Effect,
        private readonly speechEffect: Effect,
    ) {}

    public static async new(context: GlContext, getConfig: () => Config) {
        const shadowEffect = await createShadowEffect(context, () => getConfig().effects.shadow);
        const backlightEffect = await createBackLightEffect(context);
        const bloomEffect = await createBloomEffect(context);
        const speechEffect = await createSpeechEffect(context, () => getConfig().effects.speech);

        return new EffectManager(
            getConfig,
            shadowEffect,
            backlightEffect,
            bloomEffect,
            speechEffect,
        );
    }

    public getActiveEffects() {
        const config = this.getConfig();
        return [
            config.effects.speech.active && this.speechEffect,
            config.effects.shadow.active && this.shadowEffect,
            config.effects.backlightEffect.active && this.backlightEffect,
            config.effects.backlightEffect.active && this.bloomEffect,
        ].filter((it): it is Effect => !!it);
    }
}
