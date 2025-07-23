const width = 256;
const mask = width - 1;

function mixkey(seed: string): number[] {
  const stringseed = seed + '';
  const key: number[] = [];
  let j = 0;
  let smear = 0;
  while (j < stringseed.length) {
    key[mask & j] =
      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
  }
  return key;
}

export class ARC4 {
    private j = 0;
    private i = 0;
    private S: number[] = [];

    constructor(key: number[]) {
        const keylen = key.length;
        let i = 0, j = this.i = this.j = 0;
        let t = 0;

        while (i < width) {
            this.S[i] = i++;
        }
        for (i = 0; i < width; i++) {
            this.S[i] = this.S[j = mask & (j + key[i % keylen] + (t = this.S[i]))];
            this.S[j] = t;
        }
    }

    public static fromString(key: string) {
        return new ARC4(mixkey(key));
    }

    public static fromNumber(key: number) {
        return ARC4.fromString(key.toString(36));
    }

    private get(count: number): number {
        let t, r = 0,
            i = this.i, j = this.j;
        while (count--) {
        t = this.S[i = mask & (i + 1)];
        r = r * width + this.S[mask & ((this.S[i] = this.S[j = mask & (j + t)]) + (this.S[j] = t))];
        }
        this.i = i; this.j = j;
        return r / 0x100000000;
    }

    public next(): number {
        return this.get(4);
    }

    public choice<T>(array: T[]): T {
        if (array.length === 0) {
            throw new Error('Cannot choose from an empty array');
        }
        const index = Math.floor((this.next() * array.length) % array.length);
        return array[index];
    }
}
