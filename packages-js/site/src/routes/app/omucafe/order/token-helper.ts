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
