import type { TOKEN } from '@2ji-han/kuromoji.js/util/ipadic-formatter.js';

export function isAsciiSymbol(char: string) {
    const code = char.charCodeAt(0);
    return (code >= 33 && code <= 47) ||
            (code >= 58 && code <= 64) ||
            (code >= 91 && code <= 96) ||
            (code >= 123 && code <= 126);
}

export function isEmoji(char: string) {
    const code = char.charCodeAt(0);
    return (code >= 0x1F600 && code <= 0x1F64F) ||
            (code >= 0x1F300 && code <= 0x1F5FF) ||
            (code >= 0x1F680 && code <= 0x1F6FF) ||
            (code >= 0x2600 && code <= 0x26FF) ||
            (code >= 0x2700 && code <= 0x27BF) ||
            (code >= 0xFE00 && code <= 0xFE0F) ||
            (code >= 0x1F900 && code <= 0x1F9FF) ||
            (code >= 0x1FA70 && code <= 0x1FAFF);
}

export function removeRepeatingTokens(tokens: TOKEN[]) {
    const result: typeof tokens = [];
    let prevToken: typeof tokens[number] | null = null;
    for (const token of tokens) {
        if (prevToken && token.pos === prevToken.pos) {
            continue;
        }
        result.push(token);
        prevToken = token;
    }
    return result;
}
