import type { TOKEN } from '@2ji-han/kuromoji.js/util/ipadic-formatter.js';
import type { Message } from '@omujs/chat/models/message.js';
import { getGame, type User } from '../omucafe-app.js';
import { acquireRenderLock, getContext, markChanged } from './game.js';
import type { Product } from './product.js';

type OrderStatus = {
    type: 'waiting',
} | {
    type: 'cooking',
} | {
    type: 'done',
};

export type OrderItem = {
    product_id: string,
    notes: string,
};

export type Order = {
    id: string,
    user: User,
    status: OrderStatus,
    items: OrderItem[],
}

type ProductTokens = {
    product: Product;
    tokens: TOKEN[];
};

function isEmptyToken(token: TOKEN) {
    return (
        token.pos === '記号' &&
        [
            token.pos_detail_1,
            token.pos_detail_2,
            token.pos_detail_3,
        ].includes('空白')
    );
}

function matchTokens(
    tokens: TOKEN[],
    offset: number,
    targetTokens: TOKEN[],
): { length: number } | null {
    let index = 0;
    let targetIndex = 0;
    while (targetIndex < targetTokens.length) {
        if (index + offset > tokens.length) return null;
        const token = tokens[index + offset];
        const target = targetTokens[targetIndex];
        if (isEmptyToken(token)) {
            index++;
            continue;
        }
        if (isEmptyToken(target)) {
            targetIndex++;
            continue;
        }
        if (token.pos !== target.pos) return null;
        if (token.pronunciation !== target.pronunciation) return null;
        index++;
        targetIndex++;
    }
    return {
        length: index,
    };
}

type OrderDetectToken = {
    type: 'product';
    product: Product;
} | {
    type: 'token';
    pos: string;
    surface_form: string;
    basic_form: string;
    pronunciation?: string;
};

type OrderDetectResult = {
    detected: boolean;
    products: Product[];
    tokens: OrderDetectToken[];
}

function detectOrder(tokens: TOKEN[], productTokens: ProductTokens[]): OrderDetectResult {
    // const products: ProductTokens[] = [
    //     "食べくらべポテナゲ大",
    //     "アリ専用パフェ",
    //     "北海道4種のチーズてりやき セット",
    // ].map((name) => {
    //     return { name, tokens: tokenizer!.tokenize(name) };
    // });
    let index = 0;
    const products: Product[] = [];
    const replacedTokens: OrderDetectToken[] = [];
    while (tokens.length > index) {
        let matched = false;
        for (let i = 0; i < productTokens.length; i++) {
            const entry = productTokens[i];
            if (tokens.length < entry.tokens.length) continue;
            const match = matchTokens(tokens, index, entry.tokens);
            if (!match) continue;
            const alreadyAdded = products.some((p) => p.id === entry.product.id);
            if (alreadyAdded) continue;
            replacedTokens.push({
                type: 'product',
                product: entry.product,
            });
            products.push(entry.product);
            index += match.length;
            matched = true;
            break;
        }
        if (!matched) {
            const token = tokens[index];
            replacedTokens.push({
                type: 'token',
                pos: token.pos,
                surface_form: token.surface_form,
                basic_form: token.basic_form,
                pronunciation: token.pronunciation,
            });
            index++;
        }
    }
    return {
        detected: products.length > 0,
        products: products,
        tokens: replacedTokens,
    }
}

const tokenCache: Map<string, TOKEN[]> = new Map();

async function parseToken(text: string): Promise<TOKEN[]> {
    const game = getGame();
    if (!game?.worker) {
        throw new Error('Worker is not initialized');
    }
    const existing = tokenCache.get(text);
    if (existing) {
        return existing;
    }
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
    const [last, ...rest] = lastItems.values();
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
    const { orders } = getGame();
    const ctx = getContext();
    ctx.order = order;
    order.status = {
        type: 'cooking',
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

export async function processMessage(message: Message) {
    await acquireRenderLock();
    const ctx = getContext();
    const game = getGame();
    if (!game.worker) return;
    if (!message.authorId) return;
    const author = await game.chat.authors.get(message.authorId.key());
    if (!author || !author.name) return;
    const { config } = ctx;
    const tokens = await game.worker.call('tokenize', message.text);
    console.log('[msg]', JSON.stringify(tokens));
    const productTokens: ProductTokens[] = await Promise.all(Object.values(config.products).map(async (product) => {
        return {
            product,
            tokens: await parseToken(product.name)
        }
    }));
    const order = detectOrder(tokens, productTokens);
    if (!order.detected) return;
    await game.orders.add({
        id: message.id.key(),
        items: order.products.map((product) => {
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
    });
    await updateOrders();
    markChanged();
}
