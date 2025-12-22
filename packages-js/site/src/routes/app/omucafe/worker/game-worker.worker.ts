import kuromoji from '@2ji-han/kuromoji.js';
import { DynamicDictionaries } from '@2ji-han/kuromoji.js/dict/dynamic-dictionaries.js';
import type { DictionaryLoader } from '@2ji-han/kuromoji.js/loader.js';
import type { TOKEN } from '@2ji-han/kuromoji.js/util/ipadic-formatter.js';
import { BROWSER } from 'esm-env';
import { calculateSimilarity, hasMatchingTokenSet, matchTokens } from '../../../../lib/token-helper.js';
import type { OrderDetectToken, ProductTokens } from '../order/order.js';
import type { Product } from '../product/product.js';
import type { GameCommands } from './game-worker.js';
import { WorkerPipe } from './worker.js';

// --- Configuration Constants ---
const DICT_FILES = [
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
] as const; // Use `const` assertion for type safety

const REQUIRED_ORDER_TOKENS = [
    'ください',
    '御願い',
    'お願い',
    'いただけますか',
    '頂ける',
    'ちょうだい',
    'ほしい',
    'くれる',
    '食べたい',
    '食べる',
    '頼む',
] as const;

// --- Helper Functions ---
function resolvePath(base: URL, path: string): URL {
    const { pathname } = base;
    return new URL(
        pathname.endsWith('/') ? pathname + path : `${pathname}/${path}`,
        base,
    );
}

// --- Dictionary Loader Class ---
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

    // Renamed to be private and clearer, using `URL` directly
    async #loadArrayBuffer(url: URL): Promise<ArrayBuffer> {
        // Proxy URL construction is already correct
        const res = await fetch(`http://localhost:26423/proxy?url=${encodeURIComponent(url.toString())}`);
        const buffer = await res.arrayBuffer();

        // Use a single line for streaming operations
        const decompressedStream = new Blob([buffer])
            .stream()
            .pipeThrough(new DecompressionStream('gzip') as ReadableWritablePair<Uint8Array>);

        return new Response(decompressedStream).arrayBuffer();
    }

    async load(): Promise<DynamicDictionaries> {
        const dictionaries = new DynamicDictionaries();

        // Use the DICT_FILES constant
        const buffers = await Promise.all(
            DICT_FILES.map((filename) => this.#loadArrayBuffer(resolvePath(this.#resourceBase, filename))),
        );

        // Destructure buffers for cleaner loading
        const [
            trieBase, trieCheck,
            tid, tidPos, tidMap,
            cc,
            unk, unkPos, unkMap, unkChar, unkCompat, unkInvoke,
        ] = buffers;

        // Trie
        dictionaries.loadTrie(new Int32Array(trieBase), new Int32Array(trieCheck));
        // Token info dictionaries
        dictionaries.loadTokenInfoDictionaries(
            new Uint8Array(tid),
            new Uint8Array(tidPos),
            new Uint8Array(tidMap),
        );
        // Connection cost matrix
        dictionaries.loadConnectionCosts(new Int16Array(cc));
        // Unknown dictionaries
        dictionaries.loadUnknownDictionaries(
            new Uint8Array(unk),
            new Uint8Array(unkPos),
            new Uint8Array(unkMap),
            new Uint8Array(unkChar),
            new Uint32Array(unkCompat),
            new Uint8Array(unkInvoke),
        );
        return dictionaries;
    }
}

// --- Main Initialization and Worker Logic ---
async function init() {
    const DICT_URL = 'https://github.com/OMUAPPS/assets/raw/refs/heads/main/data/dict/';
    const dictionary = await ProxyGZipDictionaryLoader.fromURL(DICT_URL);
    const tokenizer = await kuromoji.fromDictionary(dictionary);
    const worker = WorkerPipe.self<GameCommands>();

    const tokenCache: Map<string, TOKEN[]> = new Map();

    // Pre-tokenize required order tokens once
    const requiredTokenSets = REQUIRED_ORDER_TOKENS.map((word) => tokenizer.tokenize(word));

    // Removed `async` since it doesn't use `await`
    function tokenize(text: string): TOKEN[] {
        const existing = tokenCache.get(text);
        if (existing) return existing;
        const tokens = tokenizer.tokenize(text);
        tokenCache.set(text, tokens);
        return tokens;
    }

    worker.bind('tokenize', async (text) => tokenize(text));

    worker.bind('analyzeOrder', async (args: { tokens: TOKEN[]; productTokens: ProductTokens[] }) => {
        const { tokens, productTokens } = args;

        // 1. Check for required order tokens
        if (!hasMatchingTokenSet(tokens, ...requiredTokenSets)) {
            return { detected: false, products: [], tokens: [] };
        }

        const products: Product[] = [];
        const replacedTokens: OrderDetectToken[] = [];
        let index = 0;

        // 2. Direct product matching and token replacement
        while (tokens.length > index) {
            let matchedProduct: Product | null = null;
            let matchLength = 0;

            // Find the longest/best matching product token sequence
            for (const entry of productTokens) {
                const isSufficientLength = tokens.length >= index + entry.tokens.length;
                if (!isSufficientLength) continue;

                const match = matchTokens(tokens, index, entry.tokens);
                if (match) {
                    const alreadyAdded = products.some((p) => p.id === entry.product.id);
                    if (alreadyAdded) continue;

                    // Prioritize the longest match if multiple products match at the same index
                    // Assuming productTokens is sorted or we just take the first match (as in original)
                    if (entry.tokens.length > matchLength) {
                        matchedProduct = entry.product;
                        matchLength = entry.tokens.length;
                    }
                }
            }

            if (matchedProduct) {
                // Add the matched product and update index
                replacedTokens.push({
                    type: 'product',
                    product: matchedProduct,
                });
                products.push(matchedProduct);
                index += matchLength;
            } else {
                // If no product matched, push the current token
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

        // 3. Handle direct matches found
        if (products.length > 0) {
            return {
                detected: true, // products.length > 0 is implied
                products: products,
                tokens: replacedTokens,
            };
        }

        // 4. Calculate similarity if no direct matches were found
        const similarities = productTokens
            .map((entry) => ({
                product: entry.product,
                similarity: calculateSimilarity(entry.tokens, tokens),
            }))
            .filter(({ similarity }) => similarity >= 1 / 3);

        if (similarities.length === 0) {
            return { detected: false, products: [], tokens: [] };
        }

        // Sort by similarity descending
        // Simplified sorting using `comparator` or simple inline function
        similarities.sort((a, b) => b.similarity - a.similarity);

        // Check for ties in the top similarity score
        const topSimilarity = similarities[0].similarity;
        const hasUniqueTopMatch = similarities.every(
            (s, i) => i === 0 || s.similarity < topSimilarity,
        );

        if (!hasUniqueTopMatch) {
            return { detected: false, products: [], tokens: [] };
        }

        return {
            detected: true,
            products: [similarities[0].product],
            tokens: [],
        };
    });

    worker.call('ready', undefined);
}

if (BROWSER) {
    init();
}
