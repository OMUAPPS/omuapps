import type { GlTexture } from '$lib/components/canvas/glcontext';
import { Vec2, type Vec2Like } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { ARC4 } from '$lib/random';
import { Timer } from '$lib/timer';
import { validateAsset, type Asset } from '../../core/asset';
import type { Game } from '../../core/game';
import { validateEnum, validateVec2, type ValidateResult } from '../../core/helper';
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

    constructor(private readonly game: Game) {}

    create(): AttrParticle {
        return {
            assets: [],
            origin: { x: 0, y: 0 },
            position: { x: 50, y: 50 },
            velocity: { x: 10, y: 10 },
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

    validate(value: AttrParticle): ValidateResult<AttrParticle> {
        if (!Array.isArray(value.assets)) {
            return { type: 'invalid', message: 'assetsはAssetの配列でなければなりません' };
        }
        for (const asset of value.assets) {
            const assetResult = validateAsset(asset);
            if (assetResult.type === 'invalid') {
                return { type: 'invalid', message: `assetsの要素が無効: ${assetResult.message}` };
            }
        }
        const originResult = validateVec2(value.origin);
        if (originResult.type === 'invalid') {
            return { type: 'invalid', message: `originが無効: ${originResult.message}` };
        }
        const positionResult = validateVec2(value.position);
        if (positionResult.type === 'invalid') {
            return { type: 'invalid', message: `positionが無効: ${positionResult.message}` };
        }
        const velocityResult = validateVec2(value.velocity);
        if (velocityResult.type === 'invalid') {
            return { type: 'invalid', message: `velocityが無効: ${velocityResult.message}` };
        }
        const accelerationResult = validateVec2(value.acceleration);
        if (accelerationResult.type === 'invalid') {
            return { type: 'invalid', message: `accelerationが無効: ${accelerationResult.message}` };
        }
        if (typeof value.random !== 'boolean') {
            return { type: 'invalid', message: 'randomはbooleanでなければなりません' };
        }
        const horizontalResult = validateEnum(value.direction.horizontal, ['left', 'right', 'both']);
        if (horizontalResult.type === 'invalid') {
            return { type: 'invalid', message: `direction.horizontalが無効: ${horizontalResult.message}` };
        }
        const verticalResult = validateEnum(value.direction.vertical, ['up', 'down', 'both']);
        if (verticalResult.type === 'invalid') {
            return { type: 'invalid', message: `direction.verticalが無効: ${verticalResult.message}` };
        }
        if (typeof value.count !== 'number' || value.count <= 0) {
            return { type: 'invalid', message: 'countは正の数でなければなりません' };
        }
        if (typeof value.duration !== 'number' || value.duration <= 0) {
            return { type: 'invalid', message: 'durationは正の数でなければなりません' };
        }
        return { type: 'valid', value: value };
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
                assetState.promise.then(() => {
                    task.resolve();
                });
            }
        }
    }

    /**
     * ランダムにテクスチャを取得する
     */
    private getTexture(attr: AttrParticle, random: ARC4): GlTexture {
        const asset = random.choice(attr.assets);
        const assetState = this.game.asset.getTexture(asset);

        if (assetState.type !== 'ready') {
            throw new Error(`Asset not loaded: ${JSON.stringify(asset)}`);
        }

        return assetState.data.texture;
    }

    /**
     * 初期位置を計算する
     */
    private getInitialPosition(attr: AttrParticle, random: ARC4): Vec2 {
        const pos = Vec2.from(attr.position);
        if (!attr.random) return pos;

        return new Vec2(
            pos.x * (random.next() - 0.5) * 2,
            pos.y * (random.next() - 0.5) * 2,
        );
    }

    /**
     * 初期速度を計算する
     */
    private getInitialVelocity(attr: AttrParticle, random: ARC4): Vec2 {
        let velX = attr.velocity.x;
        let velY = attr.velocity.y;

        // 水平方向の向き
        if (attr.direction.horizontal === 'left') velX *= -1;
        else if (attr.direction.horizontal === 'both' && random.next() < 0.5) velX *= -1;

        // 垂直方向の向き
        if (attr.direction.vertical === 'up') velY *= -1;
        else if (attr.direction.vertical === 'both' && random.next() < 0.5) velY *= -1;

        if (attr.random) {
            velX *= random.next();
            velY *= random.next();
        }

        return new Vec2(velX, velY);
    }

    /**
     * 時間 t におけるパーティクルの現在位置を計算する
     */
    private calculatePosition(attr: AttrParticle, random: ARC4, t: number): Vec2 {
        const origin = Vec2.from(attr.origin);
        const initialPos = this.getInitialPosition(attr, random);
        const velocity = this.getInitialVelocity(attr, random);
        const acceleration = new Vec2(attr.acceleration.x, -attr.acceleration.y);

        // 等加速度直線運動の公式: p = p0 + vt + 0.5at^2
        return origin
            .add(initialPos)
            .add(velocity.scale(t))
            .add(acceleration.scale(0.5 * t * t));
    }

    /**
     * 1つのパーティクルを描画する
     */
    private drawSingleParticle(attr: AttrParticle, seed: string, particleIndex: number, particleT: number): void {
        const random = ARC4.fromString(`${seed}${particleIndex * 1000}`);
        const texture = this.getTexture(attr, random);
        const position = this.calculatePosition(attr, random, particleT);

        // サイン波でフェードイン・フェードアウトを表現
        const opacity = Math.sin(particleT * Math.PI);

        const halfW = texture.width / 2;
        const halfH = texture.height / 2;

        this.game.pipeline.draw.texture(
            position.x - halfW,
            position.y - halfH,
            position.x + halfW,
            position.y + halfH,
            texture,
            Vec4.ONE.with({ w: opacity }),
        );
    }

    async renderOverlayPost({ attr, item }: AttributeInvoke<AttrParticle>): Promise<void> {
        if (attr.assets.length === 0) return;

        const timeInSeconds = Timer.now() / 1000;
        const time = timeInSeconds / attr.duration;
        for (let index = 0; index < attr.count; index++) {
            const particleTime = time - index / attr.count;
            const particleT = particleTime % 1;
            const particleIndex = Math.floor(particleTime) * attr.count + index;

            this.drawSingleParticle(attr, item.id, particleIndex, particleT);
        }
    }
}
