import { ProxyDictionaryLoader } from '$lib/token-helper';
import kuromoji from '@2ji-han/kuromoji.js';
import type { Tokenizer } from '@2ji-han/kuromoji.js/tokenizer.js';
import { ChatEvents } from '@omujs/chat';
import { chat as chatStore } from '@omujs/ui';
import { get } from 'svelte/store';
import type { Game } from '../core/game';
import type { Order, Product } from '../core/game-state';
import { generateUid } from '../core/helper';
// Message等の型は利用環境に合わせて適宜インポートしてください
import { dev } from '$app/environment';
import type { Message } from '@omujs/chat/models';

const CONFIG = {
    ORDER_PREFIX: '#',
};

interface OrderMatch {
    products: Product[];
}

export class OrderSystem {
    private tokenizer: Tokenizer | undefined;

    constructor(private readonly game: Game) {
        if (dev) return;
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
    private async handleChatMessage(message: Message, chat: any) {
        if (!this.tokenizer || !message.content || !message.authorId) return;

        const author = await chat.authors.get(message.authorId.key());
        if (!author) return;

        // メッセージから商品を抽出
        const match = this.matchOrderText(message.text);
        if (!match) return;

        const authorKey = author.id.key();
        const existingOrder = this.getOrderByAuthorId(authorKey);

        let order: Order;

        if (existingOrder) {
            order = {
                ...existingOrder,
                items: [...existingOrder.items, ...match.products],
            };
        } else {
            // 新規オーダーの作成
            const fallbackName = author.metadata?.screen_id ?? author.id.path.at(-1) ?? 'Unknown';
            order = {
                id: generateUid(),
                items: match.products,
                user: {
                    name: author.name ?? fallbackName,
                    avatar: author.avatarUrl,
                    source: {
                        type: 'chat',
                        id: authorKey,
                    },
                },
            };
        }

        // 状態を更新
        this.game.states.orders.set(order.id, order);
    }

    /**
     * 指定した Author ID を持つ既存の注文を取得する
     */
    private getOrderByAuthorId(authorId: string): Order | undefined {
        for (const order of this.game.states.orders.values()) {
            if (order.user.source.type === 'chat' && order.user.source.id === authorId) {
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
            const proxiedUrl = this.game.app.omu.assets.proxy(request.url);
            return this.game.app.omu.http.fetch(proxiedUrl, request) as Promise<Response>;
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
            .join('');
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
                if (normalizedText[index - 1] === CONFIG.ORDER_PREFIX) {
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
