import { Vec2, type Vec2Like } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { ARC4 } from '$lib/random';
import { Timer } from '$lib/timer';
import type { Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import type { AttributeHandler, AttributeInvoke, LoadContext } from '../attribute-handler';
import ParticleEditor from './ParticleEditor.svelte';

export interface AttrParticle {
    assets: Asset[];
    origin: Vec2Like;
    position: Vec2Like;
    velocity: Vec2Like;
    acceleration: Vec2Like;
    random: boolean;
    direction: {
        horizontal: 'left' | 'right' | 'both';
        vertical: 'up' | 'down' | 'both';
    };
    count: number;
    duration: number;
}

export class AttributeParticle implements AttributeHandler<AttrParticle> {
    readonly name = 'パーティクル';
    readonly editor = ParticleEditor;

    private static readonly ALPHA_THRESHOLD = 4;

    constructor(private readonly game: Game) {}

    create(): AttrParticle {
        return {
            assets: [],
            origin: { x: 0, y: 0 },
            velocity: { x: 10, y: 10 },
            position: { x: 50, y: 50 },
            acceleration: { x: 0, y: 10 },
            random: true,
            direction: {
                horizontal: 'both',
                vertical: 'both',
            },
            count: 1,
            duration: 1,
        };
    }

    /**
     * アセットのロードタスクを登録
     */
    async load({ attr }: AttributeInvoke<AttrParticle>, ctx: LoadContext): Promise<void> {
        for (const asset of attr.assets) {
            const assetState = this.game.asset.getTexture(asset);
            if (assetState.type !== 'ready') {
                const task = ctx.create({
                    title: `画像を読み込み中: ${JSON.stringify(asset)}`,
                });
                // Promiseが解決されたらタスクを完了させる
                await assetState.promise;
                task.resolve();
            }
        }
    }

    private getTexture(attr: AttrParticle, random: ARC4) {
        const asset = random.choice(attr.assets);
        const assetState = this.game.asset.getTexture(asset);
        if (assetState.type !== 'ready') {
            throw new Error(`Asset not loaded: ${JSON.stringify(asset)}`);
        }
        const { texture } = assetState.data;
        return texture;
    }

    private getPosition(attr: AttrParticle, random: ARC4, t: number): Vec2 {
        const origin = Vec2.from(attr.origin);

        // position
        let position = Vec2.from(attr.position);
        if (attr.random) {
            position = new Vec2(
                position.x * (random.next() - 0.5) * 2,
                position.y * (random.next() - 0.5) * 2,
            );
        }

        // velocity
        let velocity = Vec2.from(attr.velocity);
        if (attr.direction.horizontal === 'left') {
            velocity = new Vec2(-velocity.x, velocity.y);
        } else if (attr.direction.horizontal === 'both') {
            velocity = new Vec2(
                velocity.x * (random.next() < 0.5 ? -1 : 1),
                velocity.y,
            );
        }
        if (attr.direction.vertical === 'up') {
            velocity = new Vec2(velocity.x, -velocity.y);
        } else if (attr.direction.vertical === 'both') {
            velocity = new Vec2(
                velocity.x,
                velocity.y * (random.next() < 0.5 ? -1 : 1),
            );
        }
        if (attr.random) {
            velocity = new Vec2(
                velocity.x * random.next(),
                velocity.y * random.next(),
            );
        }

        // acceleration
        const acceleration = new Vec2(attr.acceleration.x, -attr.acceleration.y);

        // p = p0 + vt + 0.5at^2
        return origin
            .add(position)
            .add(velocity.scale(t))
            .add(acceleration.scale(0.5 * t * t));
    }

    /**
     * 描画処理。ロード未完了時はエラーをスロー。
     */
    async renderOverlay({ attr }: AttributeInvoke<AttrParticle>): Promise<void> {
        const { draw } = this.game.pipeline;
        const time = Timer.now() / 1000;
        const timeOffset = attr.duration / attr.count;
        for (let index = 0; index < attr.count; index++) {
            const particleTime = time / attr.duration + timeOffset * index;
            const particleIndex = Math.floor(particleTime);
            const particleT = particleTime - particleIndex;
            const random = ARC4.fromNumber(particleIndex * 1000);
            const texture = this.getTexture(attr, random);
            const position = this.getPosition(attr, random, particleT);
            const opacity = Math.sin(particleT * Math.PI);
            draw.texture(
                position.x - texture.width / 2,
                position.y - texture.height / 2,
                position.x + texture.width / 2,
                position.y + texture.height / 2,
                texture,
                Vec4.ONE.with({ w: opacity }),
            );
        }
    }
}
