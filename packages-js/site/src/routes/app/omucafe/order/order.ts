import type { TOKEN } from '@2ji-han/kuromoji.js/util/ipadic-formatter.js';
import type { Message } from '@omujs/chat/models';
import { TableType } from '@omujs/omu/api/table';
import { APP_ID } from '../app.js';
import { playAudioClip } from '../asset/audioclip.js';
import { acquireRenderLock, getContext, markChanged, resources } from '../game/game.js';
import { Time } from '../game/time.js';
import { getGame, type User } from '../omucafe-app.js';
import type { Product } from '../product/product.js';

type OrderStatus = {
    type: 'waiting',
} | {
    type: 'cooking',
    timestamp: number,
} | {
    type: 'done',
};

export type OrderItem = {
    product_id: string,
    notes: string,
};

export type OrderMessage = {
    tokens: TOKEN[],
    timestamp: number,
};

export type Order = {
    id: string,
    timestamp: number,
    index: number,
    user: User,
    message?: OrderMessage,
    status: OrderStatus,
    items: OrderItem[],
};

export type ProductTokens = {
    product: Product;
    tokens: TOKEN[];
};

export type OrderDetectToken = {
    type: 'product';
    product: Product;
} | {
    type: 'token';
    pos: string;
    surface_form: string;
    basic_form: string;
    pronunciation?: string;
};

export type OrderDetectResult = {
    detected: boolean;
    products: Product[];
    tokens: OrderDetectToken[];
}

const tokenCache: Map<string, TOKEN[]> = new Map();

async function parseToken(text: string): Promise<TOKEN[]> {
    const game = getGame();
    if (!game?.worker) {
        throw new Error('Worker is not initialized');
    }
    const existing = tokenCache.get(text);
    if (existing) return existing;
    const tokens = await game.worker.call('tokenize', text);
    tokenCache.set(text, tokens);
    return tokens;
}

async function pollOrder() {
    const { orders } = getGame();
    const lastItems = await orders.fetchItems({
        limit: 4,
    });
    if (lastItems.size === 0) return;
    const [last] = lastItems.values();
    await setOrder(last);
}

export async function updateOrder(order: Order) {
    await acquireRenderLock();
    const { orders } = getGame();
    const ctx = getContext();
    if (order.status.type === 'done') {
        await orders.remove(order);
        if (order.id === ctx.order?.id) {
            ctx.order = null;
            await pollOrder();
        }
    } else {
        await orders.update(order);
        if (order.id === ctx.order?.id) {
            ctx.order = order;
        }
    }
}

async function setOrder(order: Order) {
    const ctx = getContext();
    ctx.order = order;
    order.status = {
        type: 'cooking',
        timestamp: Time.now(),
    };
    await updateOrder(order);
}

async function updateOrders() {
    const ctx = getContext();
    const current = ctx.order;
    if (!current) {
        await pollOrder();
    } else if (current.status.type === 'done') {
        await pollOrder();
    }
}

export function isNounLike(token: TOKEN): boolean {
    return token.pos === '名詞' || token.pos === '接頭詞' || token.pos === '接尾詞';
}

function mergeNounTokens(tokens: TOKEN[]): TOKEN[] {
    const merged: TOKEN[] = [];
    let lastToken: TOKEN | null = null;
    for (const token of tokens) {
        const isNoun = isNounLike(token);
        const lastNoun = lastToken && isNounLike(lastToken);
        if (lastToken && isNoun === lastNoun) {
            lastToken.surface_form += token.surface_form;
            lastToken.basic_form += token.basic_form;
            if (token.pronunciation) {
                lastToken.pronunciation = (lastToken.pronunciation || '') + token.pronunciation;
            }
        }
        else {
            if (lastToken) {
                merged.push(lastToken);
            }
            lastToken = { ...token };
        }
    }
    if (lastToken) {
        merged.push(lastToken);
    }
    return merged;
}

export async function processMessage(message: Message) {
    await acquireRenderLock();
    const ctx = getContext();
    const game = getGame();
    if (!game.worker) return;
    if (!message.authorId) return;
    const author = await game.chat.authors.get(message.authorId.key());
    if (!author || !author.name) return;
    const { config } = ctx;
    const tokens = await parseToken(message.text);
    if (ctx.order && ctx.order.user.id === author.key()) {
        ctx.order.message = {
            timestamp: Time.now(),
            tokens: mergeNounTokens(tokens),
        }
        markChanged();
    }
    console.log('[msg]', JSON.stringify(tokens));
    const productTokens: ProductTokens[] = await Promise.all(Object.values(config.products).map(async (product) => {
        return {
            product,
            tokens: await parseToken(product.name)
        }
    }));
    const orderAnalysis = await game.worker!.call('analyzeOrder', { tokens, productTokens });
    if (!orderAnalysis.detected) return;
    await playAudioClip(resources.bell_audio_clip);
    const index = await game.orders.size();
    const order: Order = {
        id: message.id.key(),
        timestamp: Time.now(),
        index,
        items: orderAnalysis.products.map((product) => {
            return {
                notes: '',
                product_id: product.id,
            }
        }),
        status: {
            type: 'waiting',
        },
        user: {
            id: author.key(),
            screen_id: author.metadata.screen_id,
            name: author.name,
            avatar: author.avatarUrl,
        },
    };
    await game.orders.add(order);
    await updateOrders();
    getContext().lastOrder = order;
    markChanged();
}

export const ORDER_TABLE_TYPE = TableType.createJson<Order>(APP_ID, {
    name: 'orders',
    key: (order) => order.id.toString(),
});
