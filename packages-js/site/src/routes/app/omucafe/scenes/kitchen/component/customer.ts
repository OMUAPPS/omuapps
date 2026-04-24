
import type { GlTexture } from '$lib/components/canvas/glcontext';
import { BetterMath } from '$lib/math';
import { AABB2 } from '$lib/math/aabb2';
import { clamp, lerp } from '$lib/math/math';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { ARC4 } from '$lib/random';
import { Timer } from '$lib/timer';
import { Content, Message } from '@omujs/chat/models';
import { elasticOut } from 'svelte/easing';
import { PALETTE_RGB } from '../../../colors';
import type { Game } from '../../../core/game';
import type { Customer, Order } from '../../../core/game-state';
import type { Action } from '../../../core/input-system';
import ch_bulb_1 from '../img/characters/bulb_1.png';
import ch_bulb_2 from '../img/characters/bulb_2.png';
import ch_kuro_1 from '../img/characters/kuro_1.png';
import ch_kuro_2 from '../img/characters/kuro_2.png';
import ch_lighter_1 from '../img/characters/lighter_1.png';
import ch_lighter_2 from '../img/characters/lighter_2.png';

interface Character {
    mute: string;
    speak: string;
}

const CHARACTERS: Character[] = [
    { mute: ch_bulb_1, speak: ch_bulb_2 },
    { mute: ch_kuro_1, speak: ch_kuro_2 },
    { mute: ch_lighter_1, speak: ch_lighter_2 },
];

// const MESSAGE_DURATION = 10000;
const MESSAGE_DURATION = 100000000;

export class CustomerRenderer {
    private static readonly TRANSITION_TIME_MS = 621;
    private static readonly NAMETAG_WIDTH = 375;
    private static readonly NAMETAG_HEIGHT = 210;
    private static readonly AVATAR_SIZE = 96;
    private static readonly POINT_RADIUS = 32;

    constructor(private readonly game: Game) {}

    async render(onActionHovered: (action: Action) => void) {
        const orders = Array.from(this.game.states.orders.values());

        if (orders.length === 0) return;

        const [firstOrder] = orders;
        const customer = this.game.states.customers.get(firstOrder.customer.id);
        if (!customer) return;
        this.game.pipeline.draw.fontFamily = 'Zen Maru Gothic';

        await this.drawCard(customer, firstOrder, onActionHovered);
        await this.drawAvatar(customer, firstOrder);
        const message = firstOrder.lastMessage && Message.deserialize(firstOrder.lastMessage);
        const shouldShowMessage = message && message.createdAt.getTime() + MESSAGE_DURATION > Date.now();
        if (shouldShowMessage) {
            await this.drawMessage(message);
        } else {
            await this.drawBubble(firstOrder);
        }
    }

    private async drawCard(customer: Customer, order: Order, onActionHovered: (action: Action) => void) {
        const { matrices, input } = this.game.pipeline;
        const mouse = matrices.getViewToWorld().transform2(input.mouse.pos);

        const elapsed = Timer.now() - order.timestamp;
        const scale = clamp(elapsed / CustomerRenderer.TRANSITION_TIME_MS, 0, 1);

        matrices.model.push();
        matrices.model.scale(1, scale, 1);

        const bounds = AABB2.fromSize({ width: CustomerRenderer.NAMETAG_WIDTH, height: CustomerRenderer.NAMETAG_HEIGHT })
            .scale(1.5).setAt(Vec2.CENTER, { x: -1100, y: -500 });

        this.drawBackground(bounds);
        const [infoBounds, pointsBounds] = bounds.split({ direction: 'y', ratio: 0.6 });

        await this.drawCustomerInfo(infoBounds, customer);
        await this.drawPointsSystem(pointsBounds, customer, mouse, onActionHovered);

        matrices.model.pop();
    }

    private async getCustomerAvatar(customer: Customer): Promise<GlTexture> {
        const random = ARC4.fromString(customer.id);
        const character = random.choice(CHARACTERS);
        const time = Timer.now() / 1000 % 4 * 2;
        const index = Math.floor(time);
        const speaking = index === 0;
        const url = speaking ? character.speak : character.mute;
        const asset = this.game.asset.getTextureByUrl(url);
        return (await asset.promise).unwrap.texture;
    }

    private async drawAvatar(customer: Customer, order: Order) {
        const elapsed = Timer.now() - order.timestamp;
        const opacity = clamp(elapsed / CustomerRenderer.TRANSITION_TIME_MS, 0, 1);

        const { draw } = this.game.pipeline;
        const texture = await this.getCustomerAvatar(customer);
        const movementY = Math.sin(elapsed / 1000 * Math.PI) * 10;
        const bounds = AABB2.fromSize(texture).setAt({ x: 0.5, y: 0.5 }, { x: -450, y: -400 + movementY });
        draw.texture(...bounds.toArray(), texture, Vec4.ONE.with({ w: opacity }));
    }

    private async drawBubble(order: Order) {
        const elapsed = Timer.now() - order.timestamp;
        const opacity = clamp(elapsed / CustomerRenderer.TRANSITION_TIME_MS, 0, 1);

        const { draw } = this.game.pipeline;
        const radius = 150;
        const angle = BetterMath.toRadians(180 - 15);
        const dir = 0.4;
        const center = new Vec2(0, -500 + Math.sin(elapsed / 1000 * Math.PI - 0.5) * 10);
        draw.circle(center.x, center.y, 0, 200, PALETTE_RGB.CUSTOMER.BUBBLE_BG.with({ w: opacity }));
        draw.triangle(
            center.add(Vec2.RIGHT.scale(radius).rotate(angle - dir)),
            center.add(Vec2.RIGHT.scale(radius * 1.5).rotate(angle)),
            center.add(Vec2.RIGHT.scale(radius).rotate(angle + dir)),
            PALETTE_RGB.CUSTOMER.BUBBLE_BG.with({ w: opacity }),
        );
        const product = order.products[0];
        const item = this.game.item.get(product.itemId);
        if (item) {
            const renderState = await this.game.itemRenderer.getItemRender(item);
            const bounds = AABB2.fromSize({ width: radius * 1.5, height: radius * 1.5 }).setAt(Vec2.CENTER, center);
            if (renderState.type === 'rendered') {
                const { renderBounds, texture } = renderState.render;
                draw.textureOutline(...bounds.fit(renderBounds.size).toArray(), texture, PALETTE_RGB.ACCENT.with({ w: opacity }), 4);
                draw.texture(...bounds.fit(renderBounds.size).toArray(), texture, Vec4.ONE.with({ w: opacity }));
            }
        }
    }

    private messageBounds: AABB2 = AABB2.ZEROONE;

    private async drawMessage(message: Message) {
        const { draw } = this.game.pipeline;
        const { content } = message;
        if (!content) return;
        const elapsed = Timer.now() - message.createdAt.getTime();
        if (elapsed < 0) return;
        const animationY = 60 / (elapsed / 1000 + 1);
        const lineHeight = 32;
        draw.fontSize = lineHeight;
        let offsetX = 0;
        let offsetY = 0;
        const anchor = new Vec2(-200, -500 + animationY);
        const maxWidth = 300;
        const processLineBreak = (width: number) => {
            if (offsetX + width > maxWidth) {
                offsetX = 0;
                offsetY += lineHeight * 1.5;
                return true;
            }
            return false;
        };
        for (const component of Content.walk(content)) {
            if (component.type === 'text') {
                const startOffsetX = offsetX;
                const startOffsetY = offsetY;
                const lines: string[] = [];
                let buffer = '';
                for (const character of component.data) {
                    const metrics = draw.measureTextActual(character);
                    const linebreak = processLineBreak(metrics.width);
                    offsetX += metrics.width;
                    buffer += character;
                    if (linebreak) {
                        lines.push(buffer);
                        buffer = '';
                    }
                }
                if (buffer) lines.push(buffer);
                offsetX = startOffsetX;
                offsetY = startOffsetY;
                for (const line of lines) {
                    const metrics = draw.measureTextActual(line);
                    processLineBreak(metrics.width);
                    await draw.textAlign(anchor.add({ x: offsetX, y: offsetY }), line, { x: 0, y: 0.5 }, Vec4.ONE, {
                        color: PALETTE_RGB.ACCENT,
                        width: 4,
                    });
                    offsetX += metrics.width;
                }
            } else if (component.type === 'image') {
                const textureState = this.game.asset.getTextureByUrl(component.data.url);
                if (textureState.type === 'ready') {
                    const { texture } = textureState.data;
                    const scale = lineHeight / texture.height;
                    const width = texture.width * scale;
                    processLineBreak(width);
                    draw.texture(
                        anchor.x + offsetX,
                        anchor.y + offsetY - lineHeight / 2,
                        anchor.x + offsetX + width,
                        anchor.y + offsetY + lineHeight / 2,
                        texture,
                        Vec4.ONE,
                    );
                    offsetX += width;
                }
            }
        }
        this.messageBounds = new AABB2(anchor, anchor.add({ x: maxWidth, y: offsetY + lineHeight }));
    }

    private drawBackground(bounds: AABB2) {
        const { draw } = this.game.pipeline;
        draw.rectangle(...bounds.offset({ x: 4, y: 32 }).toArray(), PALETTE_RGB.NAMETAG.SHADOW);
        draw.rectangle(...bounds.expand({ x: 2, y: 2 }).toArray(), PALETTE_RGB.NAMETAG.OUTLINE);
        draw.rectangle(...bounds.toArray(), PALETTE_RGB.NAMETAG.BACKGROUND);
    }

    private async drawCustomerInfo(bounds: AABB2, customer: Customer) {
        const { asset } = this.game;
        const { draw } = this.game.pipeline;
        draw.rectangleGradient2(...bounds.toArray(), PALETTE_RGB.NAMETAG.GRADIENT_1, PALETTE_RGB.NAMETAG.GRADIENT_2, Vec2.DOWN);
        draw.fontSize = 18;
        draw.fontFamily = 'Zen Maru Gothic';

        const nameAnchor = bounds.at({ x: 0.1, y: 0.8 });
        await draw.textAlign(bounds.at({ x: 0.1, y: 0.5 }), '名前', { x: 0, y: 0.5 }, PALETTE_RGB.ACCENT);

        draw.fontSize = 32;
        const textMetrics = draw.measureTextActual(customer.user.name);
        await draw.textAlign(nameAnchor, customer.user.name, { x: 0, y: 1 }, PALETTE_RGB.ACCENT);
        draw.rectangle(nameAnchor.x, nameAnchor.y + 2, nameAnchor.x + textMetrics.width, nameAnchor.y + 4, PALETTE_RGB.ACCENT);

        if (customer.user.avatar) {
            const avatarBounds = AABB2.fromSize({ width: CustomerRenderer.AVATAR_SIZE, height: CustomerRenderer.AVATAR_SIZE }).setAt({ x: 0.5, y: 0.5 }, bounds.at({ x: 0.85, y: 0.6 }));
            draw.circle(avatarBounds.center.x, avatarBounds.center.y, 0, CustomerRenderer.AVATAR_SIZE / 2 + 1, PALETTE_RGB.NAMETAG.OUTLINE);
            const avatar = asset.getTextureByUrl(customer.user.avatar);
            if (avatar.type === 'ready') {
                draw.circleTex(avatarBounds.center.x, avatarBounds.center.y, 0, CustomerRenderer.AVATAR_SIZE, avatar.data.texture);
            }
        }

        const titleAnchor = bounds.at({ x: 0.5, y: 0.2 });
        draw.fontSize = 20;
        await draw.textAlign(titleAnchor, this.game.states.shop.value.shop.name, { x: 0.5, y: 1.2 }, PALETTE_RGB.ACCENT);
        draw.fontSize = 32;
        await draw.textAlign(titleAnchor, 'ポイントカード', { x: 0.5, y: -0.2 }, PALETTE_RGB.ACCENT);
    }

    private async drawPointsSystem(bounds: AABB2, customer: Customer, mouse: Vec2, onActionHovered: (action: Action) => void) {
        const { draw } = this.game.pipeline;
        draw.rectangle(bounds.min.x, bounds.min.y, bounds.max.x, bounds.min.y + 1, PALETTE_RGB.NAMETAG.BACKGROUND);
        const count = 5;

        for (let index = 0; index < count; index++) {
            const existing = customer.stats.stamps[index];
            const pos = bounds.at({ x: lerp(0.15, 0.85, index / Math.max(1, count - 1)), y: 0.5 });
            const isHovered = pos.distance(mouse) < CustomerRenderer.POINT_RADIUS;

            if (existing) {
                const elapsed = Timer.now() - existing.timestamp;
                const t = elasticOut(Math.min(1, elapsed / 500));
                const radius = lerp(0, CustomerRenderer.POINT_RADIUS, t);
                draw.circle(pos.x, pos.y, 0, radius, PALETTE_RGB.NAMETAG.POINTS_BG);
                const textTime = Math.sqrt(Math.min(1, (elapsed - 100) / 50));
                draw.fontSize = Math.ceil(lerp(64, 32, clamp(textTime, 0, 1)));
                await draw.textAlign(pos, '✓', { x: 0.5, y: 0.5 }, PALETTE_RGB.NAMETAG.BACKGROUND.with({ w: textTime }));
            } else {
                draw.circle(pos.x, pos.y, CustomerRenderer.POINT_RADIUS, CustomerRenderer.POINT_RADIUS + 2, PALETTE_RGB.NAMETAG.POINTS_BG.with({ w: isHovered ? 1 : 0.5 }));
            }

            if (isHovered) {
                onActionHovered({
                    title: existing ? `${new Date(existing.timestamp).toLocaleString()}に記録 (スタンプを外す)` : 'スタンプを押す',
                    priority: 0,
                    invoke: async () => {
                        customer.stats.stamps[index] = existing ? null : { timestamp: Timer.now() };
                    },
                });
            }
        }
    }
}
