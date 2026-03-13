import { DynamicDictionaries } from '@2ji-han/kuromoji.js/dict/dynamic-dictionaries.js';
import type { TOKEN } from '@2ji-han/kuromoji.js/util/ipadic-formatter.js';

export function isEmptyToken(token: TOKEN) {
    return (
        token.pos === '記号' &&
        [
            token.pos_detail_1,
            token.pos_detail_2,
            token.pos_detail_3,
        ].includes('空白')
    );
}

export function matchTokens(
    tokens: TOKEN[],
    offset: number,
    targetTokens: TOKEN[],
): { length: number } | null {
    let index = 0;
    let targetIndex = 0;
    while (targetIndex < targetTokens.length) {
        if (index + offset >= tokens.length) return null;
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

export function calculateTokenSimilarity(a: TOKEN, b: TOKEN): number {
    if (!a.pronunciation || !b.pronunciation) return 0;
    let score = 0;
    if (a.pronunciation.includes(b.pronunciation)) score ++;
    if (b.pronunciation.includes(a.pronunciation)) score ++;
    if (b.pronunciation === a.pronunciation) score ++;
    if (b.pos === a.pos) score ++;
    return score / 4;
}

export function calculateSimilarityPass(srcTokens: TOKEN[], dstTokens: TOKEN[]): number {
    let dstIndex = 0;
    let score = 0;
    for (const src of srcTokens) {
        let matched = false;
        while (dstIndex < dstTokens.length) {
            const dst = dstTokens[dstIndex];
            const tokenSimilarity = calculateTokenSimilarity(src, dst);
            if (tokenSimilarity > 0) {
                matched = true;
                score += tokenSimilarity;
                break;
            }
            dstIndex ++;
            score -= 1 / 3;
        }
        if (!matched) break;
        dstIndex ++;
    }
    return score / srcTokens.length;
}

export function calculateSimilarity(srcTokens: TOKEN[], dstTokens: TOKEN[]): number {
    let maxScore = 0;
    for (let dstOffset = 0; dstOffset < dstTokens.length; dstOffset ++) {
        maxScore = Math.max(maxScore, calculateSimilarityPass(srcTokens, dstTokens.slice(dstOffset)));
    }
    for (let srcOffset = 0; srcOffset < srcTokens.length; srcOffset ++) {
        maxScore = Math.max(maxScore, calculateSimilarityPass(dstTokens, srcTokens.slice(srcOffset)));
    }
    return maxScore;
}

export function hasMatchingTokenSet(tokens: TOKEN[], ...requiredTokenSets: TOKEN[][]): boolean {
    for (let index = 0; index < tokens.length; index++) {
        for (const word of requiredTokenSets) {
            if (tokens.length >= word.length) {
                // If a match is found, we can immediately return true
                if (matchTokens(tokens, index, word)) return true;
            }
        }
    }
    return false;
}

function resolvePath(base: URL, path: string): URL {
    const { pathname } = base;
    return new URL(
        pathname.endsWith('/') ? pathname + path : `${pathname}/${path}`,
        base,
    );
}

export interface DictionaryLoader {
    load(): Promise<DynamicDictionaries>;
}

export class ProxyDictionaryLoader implements DictionaryLoader {
    private constructor(
        private readonly resourceBase: URL,
        private readonly fetch: typeof window.fetch,
    ) { }

    public static async fromURL(url: string | URL, fetch: typeof window.fetch): Promise<DynamicDictionaries> {
        const baseUrl = typeof url === 'string' ? new URL(url) : url;
        const loader = new ProxyDictionaryLoader(baseUrl, fetch);
        return loader.load();
    }

    async #loadArrayBuffer(url: URL) {
        const res = await this.fetch(url);
        const buffer = await res.arrayBuffer();
        const decompressionStream = new DecompressionStream('gzip');
        const decompressedStream = new Blob([buffer]).stream().pipeThrough(decompressionStream);
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
            ].map((filename) => this.#loadArrayBuffer(resolvePath(this.resourceBase, filename))),
        );
        // Trie
        dictionaries.loadTrie(new Int32Array(buffers[0]), new Int32Array(buffers[1]));
        // Token info dictionaries
        dictionaries.loadTokenInfoDictionaries(
            new Uint8Array(buffers[2]),
            new Uint8Array(buffers[3]),
            new Uint8Array(buffers[4]),
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
            new Uint8Array(buffers[11]),
        );
        return dictionaries;
    }
}

export interface Pattern extends Partial<TOKEN> {
    kind: 'include' | 'exclude' | 'optional';
}

export interface TokenReplacement {
    patterns: Pattern[];
    replace: string;
}

export function tokenReplace(tokens: TOKEN[], replacement: TokenReplacement): string | undefined {
    for (let index = 0; index < tokens.length - replacement.patterns.length + 1; index++) {
        let match = true;
        let tokenIndex = 0;
        let patternIndex = 0;
        while (patternIndex < replacement.patterns.length) {
            const token = tokens[index + tokenIndex];
            const pattern = replacement.patterns[patternIndex];
            for (const key in pattern) {
                if (key === 'kind') continue;
                if (token[key as keyof TOKEN] !== pattern[key as keyof TOKEN]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                if (pattern.kind === 'exclude') {
                    match = false;
                    break;
                }
                tokenIndex++;
                patternIndex++;
                continue;
            }
            if (pattern.kind === 'optional') {
                patternIndex++;
                continue;
            }
            break;
        }
        if (match) {
            return replacement.replace;
        }
    }
}

export function tokenReplaces(token: TOKEN[], replacements: TokenReplacement[]) {
    for (const replacement of replacements) {
        const replaced = tokenReplace(token, replacement);
        if (replaced) return replaced;
    }
    return token.map(t => t.surface_form).join('');
}
