import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export class AppToken {
    public static random(length = 32): string {
        return randomBytes(length).toString('base64url').slice(0, length);
    }

    public static hash(salt: string, token: string): string {
        return createHash('sha256').update(salt + token, 'utf8').digest('hex');
    }

    public static matches(salt: string, token: string, expected: string): boolean {
        const actual = Buffer.from(AppToken.hash(salt, token));
        const wanted = Buffer.from(expected);
        return actual.length === wanted.length && timingSafeEqual(actual, wanted);
    }
}
