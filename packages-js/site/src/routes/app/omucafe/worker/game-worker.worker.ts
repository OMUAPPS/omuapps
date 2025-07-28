import { comparator } from '$lib/helper.js';
import kuromoji from '@2ji-han/kuromoji.js';
import { DynamicDictionaries } from '@2ji-han/kuromoji.js/dict/dynamic-dictionaries.js';
import type { DictionaryLoader } from '@2ji-han/kuromoji.js/loader.js';
import type { TOKEN } from '@2ji-han/kuromoji.js/util/ipadic-formatter.js';
import { BROWSER } from 'esm-env';
import type { OrderDetectToken, ProductTokens } from '../order/order.js';
import { calculateSimilarity, matchTokens } from '../order/token-helper.js';
import type { Product } from '../product/product.js';
import type { GameCommands } from './game-worker.js';
import { WorkerPipe } from './worker.js';

function resolvePath(base: URL, path: string): URL {
    const { pathname } = base;
    return new URL(
        pathname.endsWith('/') ? pathname + path : `${pathname}/${path}`,
        base
    );
}

export class ProxyGZipDictionaryLoader implements DictionaryLoader {
    #resourceBase: URL;
    private constructor(baseUrl: URL) {
        this.#resourceBase = baseUrl;
    }

    public static async fromURL(url: string | URL): Promise<DynamicDictionaries> {
        const baseUrl = typeof url === 'string' ? new URL(url) : url;
        const loader = new ProxyGZipDictionaryLoader(baseUrl);
        return loader.load();
    }

    async #loadArrayBuffer(url: URL) {
        const res = await fetch(`http://localhost:26423/proxy?url=${encodeURIComponent(url.toString())}`);
        const buffer = await res.arrayBuffer();
        const decompressionStream = new DecompressionStream('gzip');
        const decompressedStream = new Blob([buffer]).stream().pipeThrough(decompressionStream as ReadableWritablePair<Uint8Array>);
        const decompressedBuffer = await new Response(decompressedStream).arrayBuffer();
        return decompressedBuffer;
    }

    async load(): Promise<DynamicDictionaries> {
        const dictionaries = new DynamicDictionaries();
        const buffers = await Promise.all(
            [
                // Trie
                'base.dat.gz',
                'check.dat.gz',
                // Token info dictionaries
                'tid.dat.gz',
                'tid_pos.dat.gz',
                'tid_map.dat.gz',
                // Connection cost matrix
                'cc.dat.gz',
                // Unknown dictionaries
                'unk.dat.gz',
                'unk_pos.dat.gz',
                'unk_map.dat.gz',
                'unk_char.dat.gz',
                'unk_compat.dat.gz',
                'unk_invoke.dat.gz',
            ].map((filename) => this.#loadArrayBuffer(resolvePath(this.#resourceBase, filename)))
        )
        // Trie
        dictionaries.loadTrie(new Int32Array(buffers[0]), new Int32Array(buffers[1]));
        // Token info dictionaries
        dictionaries.loadTokenInfoDictionaries(
            new Uint8Array(buffers[2]),
            new Uint8Array(buffers[3]),
            new Uint8Array(buffers[4])
        );
        // Connection cost matrix
        dictionaries.loadConnectionCosts(new Int16Array(buffers[5]));
        // Unknown dictionaries
        dictionaries.loadUnknownDictionaries(
            new Uint8Array(buffers[6]),
            new Uint8Array(buffers[7]),
            new Uint8Array(buffers[8]),
            new Uint8Array(buffers[9]),
            new Uint32Array(buffers[10]),
            new Uint8Array(buffers[11])
        );
        return dictionaries;
    }
}

async function init() {
    const dictionary = await ProxyGZipDictionaryLoader.fromURL('https://github.com/OMUAPPS/assets/raw/refs/heads/main/data/dict/');
    const tokenizer = await kuromoji.fromDictionary(dictionary);
    const worker = WorkerPipe.self<GameCommands>();
    

    const tokenCache: Map<string, TOKEN[]> = new Map();
    function tokenize(text: string): TOKEN[] {
        const existing = tokenCache.get(text);
        if (existing) return existing;
        const tokens = tokenizer.tokenize(text);
        tokenCache.set(text, tokens);
        return tokens;
    }
    worker.bind('tokenize', async (text) => tokenize(text));
    worker.bind('analyzeOrder', async (args: {tokens: TOKEN[], productTokens: ProductTokens[]}) => {
        const { tokens, productTokens } = args;
        const products: Product[] = [];
        const replacedTokens: OrderDetectToken[] = [];
        const required: TOKEN[][] = [
            tokenize('ください'),
            tokenize('御願い'),
            tokenize('お願い'),
            tokenize('いただけますか'),
            tokenize('頂ける'),
            tokenize('ちょうだい'),
            tokenize('ほしい'),
            tokenize('くれる'),
            tokenize('食べたい'),
            tokenize('食べる'),
            tokenize('頼む'),
        ];
        const hasRequiredTokens = hasMatchingTokenSet(tokens, required);
        if (!hasRequiredTokens) {
            return {
                detected: false,
                products: [],
                tokens: [],
            }
        }
        let index = 0;
        while (tokens.length > index) {
            let matched = false;
            for (const entry of productTokens) {
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
        if (products.length > 0) {
            return {
                detected: products.length > 0,
                products: products,
                tokens: replacedTokens,
            }
        }

        const similarities: { product: Product, similarity: number }[] = []
        for (const entry of productTokens) {
            const similarity = calculateSimilarity(entry.tokens, tokens);
            if (similarity < 1 / 3) continue;
            similarities.push({ product: entry.product, similarity });
        }
        if (similarities.length === 0) return {
            detected: false,
            products: [],
            tokens: [],
        }
        const sortedSimilarities = similarities.sort(comparator(({ similarity }) => -similarity));
        if (
            sortedSimilarities.length > 1 &&
            sortedSimilarities[0].similarity === sortedSimilarities[sortedSimilarities.length - 1].similarity
        ) return {
            detected: false,
            products: [],
            tokens: [],
        }
        
        return {
            detected: true,
            products: [sortedSimilarities[0].product],
            tokens: [],
        }
    })


    worker.call('ready', undefined);
}

if (BROWSER) {
    init();
}

function hasMatchingTokenSet(tokens: TOKEN[], required: TOKEN[][]): boolean {
    for (let index = 0; index < tokens.length; index ++) {
        for (let i = 0; i < required.length; i++) {
            const word = required[i];
            if (tokens.length < word.length) continue;
            const match = matchTokens(tokens, index, word);
            if (!match) continue;
            return true;
        }
    }
    return false;
}
