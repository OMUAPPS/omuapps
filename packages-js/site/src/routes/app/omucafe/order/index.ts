import { Timer } from '$lib/timer';
import { ProxyDictionaryLoader } from '$lib/token-helper';
import kuromoji from '@2ji-han/kuromoji.js';
import type { Tokenizer } from '@2ji-han/kuromoji.js/tokenizer.js';
import { Chat, ChatEvents } from '@omujs/chat';
import { Message } from '@omujs/chat/models';
import { chat as chatStore } from '@omujs/ui';
import { get } from 'svelte/store';
import type { Game } from '../core/game';
import type { Customer, Order, Product, User } from '../core/game-state';
import { generateUid } from '../core/helper';
import bell from './se/bell.wav';

const CONFIG = {
    ORDER_PREFIXES: ['#', '＃', '♯', '#️⃣'],
};

interface OrderMatch {
    products: Product[];
}

export class OrderSystem {
    private tokenizer: Tokenizer | undefined;

    constructor(private readonly game: Game) {
        if (game.side === 'client') {
            this.initTokenizer();
            this.setupChatListener();
        }
    }

    /**
     * チャットのイベントリスナーを登録
     */
    private setupChatListener() {
        const chat = get(chatStore);
        chat.on(ChatEvents.Message.Add, async (message: Message) => {
            await this.handleChatMessage(message, chat);
        });
    }

    /**
     * 受信したメッセージを処理し、注文の作成・更新を行う
     */
    private async handleChatMessage(message: Message, chat: Chat) {
        if (!this.tokenizer || !message.content || !message.authorId) return;

        const author = await chat.authors.get(message.authorId.key());
        if (!author) return;

        // メッセージから商品を抽出

        const authorKey = author.id.key();
        const fallbackName = author.metadata?.screen_id ?? author.id.path.at(-1) ?? 'Unknown';
        const customer = this.getCustomer({
            name: author.name ?? fallbackName,
            avatar: author.avatarUrl,
            source: {
                type: 'chat',
                id: authorKey,
            },
        });

        const existingOrder = this.getOrderByCustomerId(customer.id);

        if (existingOrder) {
            existingOrder.lastMessage = Message.serialize(message);
        }

        let order: Order;

        const match = this.matchOrderText(message.text);
        if (!match) return;

        if (existingOrder) {
            const newProducts = match.products.filter((product) => existingOrder.products.findIndex((item) => item.id === product.id) !== -1);
            if (newProducts.length === 0) return;
            order = {
                ...existingOrder,
                products: [...existingOrder.products, ...newProducts],
            };
        } else {
            // 新規オーダーの作成
            customer.stats.totalOrders++;
            order = {
                id: generateUid(),
                products: match.products,
                timestamp: Timer.now(),
                startTime: Timer.now(),
                lastMessage: Message.serialize(message),
                customer,
            };
        }
        this.game.states.orders.set(order.id, order);

        this.game.audio.start({
            type: 'single',
            asset: {
                type: 'url',
                url: bell,
            },
            duration: 2,
            start: 0,
        });
    }

    private getCustomerIdByUser(user: User): string {
        if (user.source.type === 'chat') {
            return `chat:${user.source.id}`;
        } else {
            return `task:${user.source.id}`;
        }
    }

    private getCustomer(user: User): Customer {
        const id = this.getCustomerIdByUser(user);
        let customer: Customer | undefined = this.game.states.customers.get(id);
        if (!customer) {
            customer = {
                id,
                user,
                stats: {
                    totalOrders: 0,
                    stamps: [],
                },
            };
            this.game.states.customers.set(id, customer);
        } else {
            customer.user = user;
        }
        return customer;
    }

    /**
     * 指定した Author ID を持つ既存の注文を取得する
     */
    private getOrderByCustomerId(id: string): Order | undefined {
        for (const [key, order] of this.game.states.orders.entries()) {
            if (order.customer.id === id) {
                const order = this.game.states.orders.get(key);
                return order as Order;
            }
        }
        return undefined;
    }

    /**
     * Kuromoji トークナイザーの初期化
     */
    private async initTokenizer() {
        const url = 'https://obj.omuapps.com/assets/dictionary/';

        const fetchProxy = (...params: Parameters<typeof window.fetch>) => {
            const request = new Request(...params);
            return this.game.app.omu.http.fetch(request.url, request) as Promise<Response>;
        };

        const dictionary = await ProxyDictionaryLoader.fromURL(url, fetchProxy as typeof window.fetch);
        this.tokenizer = await kuromoji.fromDictionary(dictionary);

        // 動作確認用
        console.log('Tokenizer initialized:', this.tokenizer.tokenize('すもももももももものうち'));
    }

    /**
     * テキストを正規化（読み・発音・表層形のいずれかを結合）
     */
    private normalizeText(text: string): string {
        if (!this.tokenizer) {
            throw new Error('Tokenizer is not initialized');
        }
        return this.tokenizer.tokenize(text)
            .map((token) => token.reading ?? token.pronunciation ?? token.surface_form)
            .filter(Boolean)
            .join('')
            .replace(' ', '')
            .replace('　', '')
            .replace(/＃|♯|#️⃣/, '#');
    }

    /**
     * 正規化されたテキスト内に、特定の商品（またはエイリアス）が含まれているか判定
     */
    private matchProduct(product: Product, normalizedText: string): boolean {
        const aliases = new Set([product.name, ...product.aliases]);

        for (const alias of aliases) {
            if (alias.length === 0) continue;
            const normalizedAlias = this.normalizeText(alias);
            let index = 0;

            while ((index = normalizedText.indexOf(normalizedAlias, index)) !== -1) {
                // 見つかった文字列の1つ前の文字がプレフィックス（#）であればマッチ
                if (CONFIG.ORDER_PREFIXES.includes(normalizedText[index - 1])) {
                    return true;
                }
                index += normalizedAlias.length;
            }
        }
        return false;
    }

    /**
     * メッセージテキストから該当する商品リストを抽出
     */
    private matchOrderText(text: string): OrderMatch | undefined {
        const normalized = this.normalizeText(text);
        const products = Array.from(this.game.states.products.values()).filter(product =>
            this.matchProduct(product, normalized),
        );

        return products.length > 0 ? { products } : undefined;
    }
}
