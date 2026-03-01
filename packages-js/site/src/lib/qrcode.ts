// https://github.com/kazuhikoarase/qrcode-generator - MIT license

export type TypeNumber =
    | 0
    | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
    | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
    | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30
    | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40;

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type Mode = 'Numeric' | 'Alphanumeric' | 'Byte' /* Default */ | 'Kanji';

export interface QRCodeFactory {
    (typeNumber: TypeNumber, errorCorrectionLevel: ErrorCorrectionLevel): QRCode;
}

export type QRSvgTagOpts = {
    cellSize?: number;
    margin?: number;
    scalable?: boolean;
};

export type QRData = {
    getMode(): number;
    getLength(): number;
    write(buffer: QRBitBuffer): void;
};

class QRCode {
    private readonly PAD0 = 0xEC;
    private readonly PAD1 = 0x11;
    private readonly _errorCorrectionLevel: number;
    private _modules: (boolean | null)[][] | null = null;
    private _moduleCount = 0;
    private _dataCache: (null | number[]) = null;
    private readonly _dataList: QRData[] = [];

    constructor(
        private _typeNumber: number,
        private errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H',
    ) {
        this._errorCorrectionLevel = QRErrorCorrectionLevel[this.errorCorrectionLevel];
    }

    private makeImpl(test: boolean, maskPattern: number) {
        this._moduleCount = this._typeNumber * 4 + 17;
        this._modules = new Array(this._moduleCount);
        for (let row = 0; row < this._moduleCount; row += 1) {
            this._modules[row] = new Array(this._moduleCount);
            for (let col = 0; col < this._moduleCount; col += 1) {
                this._modules[row][col] = null;
            }
        }

        this.setupPositionProbePattern(0, 0);
        this.setupPositionProbePattern(this._moduleCount - 7, 0);
        this.setupPositionProbePattern(0, this._moduleCount - 7);
        this.setupPositionAdjustPattern();
        this.setupTimingPattern();
        this.setupTypeInfo(test, maskPattern);

        if (this._typeNumber >= 7) {
            this.setupTypeNumber(test);
        }

        if (this._dataCache == null) {
            this._dataCache = this.createData(this._typeNumber, this._errorCorrectionLevel, this._dataList);
        }

        this.mapData(this._dataCache, maskPattern);
    };

    public setupPositionProbePattern(row: number, col: number) {
        for (let r = -1; r <= 7; r += 1) {
            if (row + r <= -1 || this._moduleCount <= row + r) continue;

            for (let c = -1; c <= 7; c += 1) {
                if (col + c <= -1 || this._moduleCount <= col + c) continue;

                if ((0 <= r && r <= 6 && (c == 0 || c == 6))
                    || (0 <= c && c <= 6 && (r == 0 || r == 6))
                    || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                    this._modules![row + r][col + c] = true;
                } else {
                    this._modules![row + r][col + c] = false;
                }
            }
        }
    };

    public setupTimingPattern() {
        for (let r = 8; r < this._moduleCount - 8; r += 1) {
            if (this._modules![r][6] != null) {
                continue;
            }
            this._modules![r][6] = (r % 2 == 0);
        }

        for (let c = 8; c < this._moduleCount - 8; c += 1) {
            if (this._modules![6][c] != null) {
                continue;
            }
            this._modules![6][c] = (c % 2 == 0);
        }
    };

    public setupPositionAdjustPattern() {
        const pos = QRUtil.getPatternPosition(this._typeNumber);

        for (let i = 0; i < pos.length; i += 1) {
            for (let j = 0; j < pos.length; j += 1) {
                const row = pos[i];
                const col = pos[j];

                if (this._modules![row][col] != null) {
                    continue;
                }

                for (let r = -2; r <= 2; r += 1) {
                    for (let c = -2; c <= 2; c += 1) {
                        if (r == -2 || r == 2 || c == -2 || c == 2
                            || (r == 0 && c == 0)) {
                            this._modules![row + r][col + c] = true;
                        } else {
                            this._modules![row + r][col + c] = false;
                        }
                    }
                }
            }
        }
    };

    public setupTypeNumber(test: boolean) {
        const bits = QRUtil.getBCHTypeNumber(this._typeNumber);

        for (let i = 0; i < 18; i += 1) {
            const mod = (!test && ((bits >> i) & 1) == 1);
            this._modules![Math.floor(i / 3)][i % 3 + this._moduleCount - 8 - 3] = mod;
        }

        for (let i = 0; i < 18; i += 1) {
            const mod = (!test && ((bits >> i) & 1) == 1);
            this._modules![i % 3 + this._moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
        }
    };

    public setupTypeInfo(test: boolean, maskPattern: number) {
        const data = (this._errorCorrectionLevel << 3) | maskPattern;
        const bits = QRUtil.getBCHTypeInfo(data);

        // vertical
        for (let i = 0; i < 15; i += 1) {
            const mod = (!test && ((bits >> i) & 1) == 1);

            if (i < 6) {
                this._modules![i][8] = mod;
            } else if (i < 8) {
                this._modules![i + 1][8] = mod;
            } else {
                this._modules![this._moduleCount - 15 + i][8] = mod;
            }
        }

        // horizontal
        for (let i = 0; i < 15; i += 1) {
            const mod = (!test && ((bits >> i) & 1) == 1);

            if (i < 8) {
                this._modules![8][this._moduleCount - i - 1] = mod;
            } else if (i < 9) {
                this._modules![8][15 - i - 1 + 1] = mod;
            } else {
                this._modules![8][15 - i - 1] = mod;
            }
        }

        // fixed module
        this._modules![this._moduleCount - 8][8] = (!test);
    };

    public mapData(data: number[], maskPattern: number) {
        let inc = -1;
        let row = this._moduleCount - 1;
        let bitIndex = 7;
        let byteIndex = 0;
        const maskFunc = QRUtil.getMaskFunction(maskPattern);

        for (let col = this._moduleCount - 1; col > 0; col -= 2) {
            if (col == 6) col -= 1;

            while (true) {
                for (let c = 0; c < 2; c += 1) {
                    if (this._modules![row][col - c] == null) {
                        let dark = false;

                        if (byteIndex < data.length) {
                            dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
                        }

                        const mask = maskFunc(row, col - c);

                        if (mask) {
                            dark = !dark;
                        }

                        this._modules![row][col - c] = dark;
                        bitIndex -= 1;

                        if (bitIndex == -1) {
                            byteIndex += 1;
                            bitIndex = 7;
                        }
                    }
                }

                row += inc;

                if (row < 0 || this._moduleCount <= row) {
                    row -= inc;
                    inc = -inc;
                    break;
                }
            }
        }
    };

    public createBytes(buffer: QRBitBuffer, rsBlocks: QRRSBlock[]): number[] {
        let offset = 0;

        let maxDcCount = 0;
        let maxEcCount = 0;

        const dcdata = new Array<number[]>(rsBlocks.length);
        const ecdata = new Array<number[]>(rsBlocks.length);

        for (let r = 0; r < rsBlocks.length; r += 1) {
            const dcCount = rsBlocks[r].dataCount;
            const ecCount = rsBlocks[r].totalCount - dcCount;

            maxDcCount = Math.max(maxDcCount, dcCount);
            maxEcCount = Math.max(maxEcCount, ecCount);

            dcdata[r] = new Array<number>(dcCount);

            for (let i = 0; i < dcdata[r].length; i += 1) {
                dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
            }
            offset += dcCount;

            const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
            const rawPoly = new QRPolynominal(dcdata[r], rsPoly.getLength() - 1);

            const modPoly = rawPoly.mod(rsPoly);
            ecdata[r] = new Array(rsPoly.getLength() - 1);
            for (let i = 0; i < ecdata[r].length; i += 1) {
                const modIndex = i + modPoly.getLength() - ecdata[r].length;
                ecdata[r][i] = (modIndex >= 0) ? modPoly.getAt(modIndex) : 0;
            }
        }

        let totalCodeCount = 0;
        for (let i = 0; i < rsBlocks.length; i += 1) {
            totalCodeCount += rsBlocks[i].totalCount;
        }

        const data = new Array<number>(totalCodeCount);
        let index = 0;

        for (let i = 0; i < maxDcCount; i += 1) {
            for (let r = 0; r < rsBlocks.length; r += 1) {
                if (i < dcdata[r].length) {
                    data[index] = dcdata[r][i];
                    index += 1;
                }
            }
        }

        for (let i = 0; i < maxEcCount; i += 1) {
            for (let r = 0; r < rsBlocks.length; r += 1) {
                if (i < ecdata[r].length) {
                    data[index] = ecdata[r][i];
                    index += 1;
                }
            }
        }

        return data;
    };

    public createData(typeNumber: number, errorCorrectionLevel: number, dataList: QRData[]) {
        const buffer = new QRBitBuffer();

        for (let i = 0; i < dataList.length; i += 1) {
            const data = dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber));
            data.write(buffer);
        }

        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

        // calc num max data.
        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i += 1) {
            totalDataCount += rsBlocks[i].dataCount;
        }

        if (buffer.getLengthInBits() > totalDataCount * 8) {
            throw 'code length overflow. ('
            + buffer.getLengthInBits()
            + '>'
            + totalDataCount * 8
            + ')';
        }

        // end code
        if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
            buffer.put(0, 4);
        }

        // padding
        while (buffer.getLengthInBits() % 8 != 0) {
            buffer.putBit(false);
        }

        // padding
        while (true) {
            if (buffer.getLengthInBits() >= totalDataCount * 8) {
                break;
            }
            buffer.put(this.PAD0, 8);

            if (buffer.getLengthInBits() >= totalDataCount * 8) {
                break;
            }
            buffer.put(this.PAD1, 8);
        }

        return this.createBytes(buffer, rsBlocks);
        // return buffer.getBuffer();
    };

    public addData(data: string, mode?: 'Numeric' | 'Alphanumeric' | 'Byte' | 'Kanji'): void {
        mode = mode ?? 'Byte';

        // eslint-disable-next-line no-useless-assignment
        let newData: QRData | null = null;

        switch (mode) {
            case 'Numeric':
                newData = new QRNumber(data);
                break;
            case 'Alphanumeric':
                newData = new QRAlphaNum(data);
                break;
            case 'Byte':
                newData = new QR8BitByte(data);
                break;
            default:
                throw 'mode:' + mode;
        }

        this._dataList.push(newData);
        this._dataCache = null;
    };

    public addDataRaw(mode: number, length: number, data: boolean[]): void {
        const newData = new QRRawData(mode, length, data);
        this._dataList.push(newData);
        this._dataCache = null;
    };

    public isDark(row: number, col: number) {
        if (row < 0 || this._moduleCount <= row || col < 0 || this._moduleCount <= col) {
            throw row + ',' + col;
        }
        return this._modules![row][col];
    };

    public getModuleCount(): number {
        return this._moduleCount;
    };

    public make(): void {
        this.makeImpl(false, 3);
    };

    public toCanvas(cellSize: number = 2, margin: number = cellSize * 4): HTMLCanvasElement {
        const size = this.getModuleCount() * cellSize + margin * 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#000';
        for (let row = 0; row < this.getModuleCount(); row += 1) {
            for (let col = 0; col < this.getModuleCount(); col += 1) {
                if (this.isDark(row, col)) {
                    ctx.fillRect(col * cellSize + margin, row * cellSize + margin, cellSize, cellSize);
                }
            }
        }
        return canvas;
    };

    public toDataURL(cellSize: number = 2, margin: number = cellSize * 4): string {
        const canvas = this.toCanvas(cellSize, margin);
        return canvas.toDataURL();
    };
}

//---------------------------------------------------------------------
// qrcode.stringToBytes
//---------------------------------------------------------------------

function stringToBytes(s: string) {
    const bytes: number[] = [];
    for (let i = 0; i < s.length; i += 1) {
        const c = s.charCodeAt(i);
        bytes.push(c & 0xff);
    }
    return bytes;
}

;

//---------------------------------------------------------------------
// QRMode
//---------------------------------------------------------------------

const QRMode = {
    NUMBER: 0b0001,
    ALPHA_NUM: 0b0010,
    BYTE: 0b0100,
    KANJI: 0b1000,
} as const;

//---------------------------------------------------------------------
// QRErrorCorrectionLevel
//---------------------------------------------------------------------

const QRErrorCorrectionLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2,
} as const;

//---------------------------------------------------------------------
// QRMaskPattern
//---------------------------------------------------------------------

const QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7,
};

//---------------------------------------------------------------------
// QRUtil
//---------------------------------------------------------------------

class QRUtil {
    private static PATTERN_POSITION_TABLE = [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170],
    ];
    private static G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    private static G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    private static G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    public static getBCHDigit(data: number): number {
        let digit = 0;
        while (data != 0) {
            digit += 1;
            data >>>= 1;
        }
        return digit;
    };

    public static getBCHTypeInfo(data: number): number {
        let d = data << 10;
        while (this.getBCHDigit(d) - this.getBCHDigit(this.G15) >= 0) {
            d ^= (this.G15 << (this.getBCHDigit(d) - this.getBCHDigit(this.G15)));
        }
        return ((data << 10) | d) ^ this.G15_MASK;
    };

    public static getBCHTypeNumber(data: number): number {
        let d = data << 12;
        while (this.getBCHDigit(d) - this.getBCHDigit(this.G18) >= 0) {
            d ^= (this.G18 << (this.getBCHDigit(d) - this.getBCHDigit(this.G18)));
        }
        return (data << 12) | d;
    };

    public static getPatternPosition(typeNumber: number): number[] {
        return this.PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    public static getMaskFunction(maskPattern: number) {
        switch (maskPattern) {
            case QRMaskPattern.PATTERN000:
                return (i: number, j: number) => (i + j) % 2 == 0; ;
            case QRMaskPattern.PATTERN001:
                return (i: number) => i % 2 == 0; ;
            case QRMaskPattern.PATTERN010:
                return (_i: number, j: number) => j % 3 == 0; ;
            case QRMaskPattern.PATTERN011:
                return (i: number, j: number) => (i + j) % 3 == 0; ;
            case QRMaskPattern.PATTERN100:
                return (i: number, j: number) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0; ;
            case QRMaskPattern.PATTERN101:
                return (i: number, j: number) => (i * j) % 2 + (i * j) % 3 == 0; ;
            case QRMaskPattern.PATTERN110:
                return (i: number, j: number) => ((i * j) % 2 + (i * j) % 3) % 2 == 0; ;
            case QRMaskPattern.PATTERN111:
                return (i: number, j: number) => ((i * j) % 3 + (i + j) % 2) % 2 == 0; ;

            default:
                throw 'bad maskPattern:' + maskPattern;
        }
    };

    public static getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynominal {
        let a = new QRPolynominal([1], 0);
        for (let i = 0; i < errorCorrectLength; i += 1) {
            a = a.multiply(new QRPolynominal([1, QRMath.gexp(i)], 0));
        }
        return a;
    };

    public static getLengthInBits(mode: number, type: number) {
        if (1 <= type && type < 10) {
            // 1 - 9

            switch (mode) {
                case QRMode.NUMBER: return 10;
                case QRMode.ALPHA_NUM: return 9;
                case QRMode.BYTE: return 8;
                case QRMode.KANJI: return 8;
                default:
                    throw 'mode:' + mode;
            }
        } else if (type < 27) {
            // 10 - 26

            switch (mode) {
                case QRMode.NUMBER: return 12;
                case QRMode.ALPHA_NUM: return 11;
                case QRMode.BYTE: return 16;
                case QRMode.KANJI: return 10;
                default:
                    throw 'mode:' + mode;
            }
        } else if (type < 41) {
            // 27 - 40

            switch (mode) {
                case QRMode.NUMBER: return 14;
                case QRMode.ALPHA_NUM: return 13;
                case QRMode.BYTE: return 16;
                case QRMode.KANJI: return 12;
                default:
                    throw 'mode:' + mode;
            }
        } else {
            throw 'type:' + type;
        }
    };

    public static getLostPoint(qrcode: QRCode) {
        const moduleCount = qrcode.getModuleCount();

        let lostPoint = 0;

        // LEVEL1

        for (let row = 0; row < moduleCount; row += 1) {
            for (let col = 0; col < moduleCount; col += 1) {
                let sameCount = 0;
                const dark = qrcode.isDark(row, col);

                for (let r = -1; r <= 1; r += 1) {
                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (let c = -1; c <= 1; c += 1) {
                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r == 0 && c == 0) {
                            continue;
                        }

                        if (dark == qrcode.isDark(row + r, col + c)) {
                            sameCount += 1;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        };

        // LEVEL2

        for (let row = 0; row < moduleCount - 1; row += 1) {
            for (let col = 0; col < moduleCount - 1; col += 1) {
                let count = 0;
                if (qrcode.isDark(row, col)) count += 1;
                if (qrcode.isDark(row + 1, col)) count += 1;
                if (qrcode.isDark(row, col + 1)) count += 1;
                if (qrcode.isDark(row + 1, col + 1)) count += 1;
                if (count == 0 || count == 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (let row = 0; row < moduleCount; row += 1) {
            for (let col = 0; col < moduleCount - 6; col += 1) {
                if (qrcode.isDark(row, col)
                    && !qrcode.isDark(row, col + 1)
                    && qrcode.isDark(row, col + 2)
                    && qrcode.isDark(row, col + 3)
                    && qrcode.isDark(row, col + 4)
                    && !qrcode.isDark(row, col + 5)
                    && qrcode.isDark(row, col + 6)) {
                    lostPoint += 40;
                }
            }
        }

        for (let col = 0; col < moduleCount; col += 1) {
            for (let row = 0; row < moduleCount - 6; row += 1) {
                if (qrcode.isDark(row, col)
                    && !qrcode.isDark(row + 1, col)
                    && qrcode.isDark(row + 2, col)
                    && qrcode.isDark(row + 3, col)
                    && qrcode.isDark(row + 4, col)
                    && !qrcode.isDark(row + 5, col)
                    && qrcode.isDark(row + 6, col)) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4

        let darkCount = 0;

        for (let col = 0; col < moduleCount; col += 1) {
            for (let row = 0; row < moduleCount; row += 1) {
                if (qrcode.isDark(row, col)) {
                    darkCount += 1;
                }
            }
        }

        const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;
    };
}

class QRMath {
    private static EXP_TABLE = new Array(256);
    private static LOG_TABLE = new Array(256);

    static {
        // initialize tables
        for (let i = 0; i < 8; i += 1) {
            this.EXP_TABLE[i] = 1 << i;
        }
        for (let i = 8; i < 256; i += 1) {
            this.EXP_TABLE[i] = this.EXP_TABLE[i - 4]
                ^ this.EXP_TABLE[i - 5]
                ^ this.EXP_TABLE[i - 6]
                ^ this.EXP_TABLE[i - 8];
        }
        for (let i = 0; i < 255; i += 1) {
            this.LOG_TABLE[this.EXP_TABLE[i]] = i;
        }
    }

    public static glog(n: number) {
        if (n < 1) {
            throw 'glog(' + n + ')';
        }

        return this.LOG_TABLE[n];
    };

    public static gexp(n: number) {
        while (n < 0) {
            n += 255;
        }

        while (n >= 256) {
            n -= 255;
        }

        return this.EXP_TABLE[n];
    };
}

export class QRPolynominal {
    private num: number[];

    constructor(num: number[], shift: number) {
        if (typeof num.length == 'undefined') {
            throw num.length + '/' + shift;
        }

        let offset = 0;
        while (offset < num.length && num[offset] == 0) {
            offset += 1;
        }

        this.num = new Array(num.length - offset + shift);
        for (let i = 0; i < num.length - offset; i += 1) {
            this.num[i] = num[i + offset];
        }
    }

    public getAt(index: number): number {
        return this.num[index];
    };

    public getLength(): number {
        return this.num.length;
    };

    public multiply(e: QRPolynominal): QRPolynominal {
        const num = new Array(this.getLength() + e.getLength() - 1);

        for (let i = 0; i < this.getLength(); i += 1) {
            for (let j = 0; j < e.getLength(); j += 1) {
                num[i + j] ^= QRMath.gexp(QRMath.glog(this.getAt(i)) + QRMath.glog(e.getAt(j)));
            }
        }

        return new QRPolynominal(num, 0);
    };

    public mod(e: QRPolynominal): QRPolynominal {
        if (this.getLength() - e.getLength() < 0) {
            return this;
        }

        const ratio = QRMath.glog(this.getAt(0)) - QRMath.glog(e.getAt(0));

        const num = new Array(this.getLength());
        for (let i = 0; i < this.getLength(); i += 1) {
            num[i] = this.getAt(i);
        }

        for (let i = 0; i < e.getLength(); i += 1) {
            num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
        }

        // recursive call
        return new QRPolynominal(num, 0).mod(e);
    };
}

//---------------------------------------------------------------------
// QRRSBlock
//---------------------------------------------------------------------

class QRRSBlock {
    private static RS_BLOCK_TABLE = [

        // L
        // M
        // Q
        // H

        // 1
        [1, 26, 19],
        [1, 26, 16],
        [1, 26, 13],
        [1, 26, 9],

        // 2
        [1, 44, 34],
        [1, 44, 28],
        [1, 44, 22],
        [1, 44, 16],

        // 3
        [1, 70, 55],
        [1, 70, 44],
        [2, 35, 17],
        [2, 35, 13],

        // 4
        [1, 100, 80],
        [2, 50, 32],
        [2, 50, 24],
        [4, 25, 9],

        // 5
        [1, 134, 108],
        [2, 67, 43],
        [2, 33, 15, 2, 34, 16],
        [2, 33, 11, 2, 34, 12],

        // 6
        [2, 86, 68],
        [4, 43, 27],
        [4, 43, 19],
        [4, 43, 15],

        // 7
        [2, 98, 78],
        [4, 49, 31],
        [2, 32, 14, 4, 33, 15],
        [4, 39, 13, 1, 40, 14],

        // 8
        [2, 121, 97],
        [2, 60, 38, 2, 61, 39],
        [4, 40, 18, 2, 41, 19],
        [4, 40, 14, 2, 41, 15],

        // 9
        [2, 146, 116],
        [3, 58, 36, 2, 59, 37],
        [4, 36, 16, 4, 37, 17],
        [4, 36, 12, 4, 37, 13],

        // 10
        [2, 86, 68, 2, 87, 69],
        [4, 69, 43, 1, 70, 44],
        [6, 43, 19, 2, 44, 20],
        [6, 43, 15, 2, 44, 16],

        // 11
        [4, 101, 81],
        [1, 80, 50, 4, 81, 51],
        [4, 50, 22, 4, 51, 23],
        [3, 36, 12, 8, 37, 13],

        // 12
        [2, 116, 92, 2, 117, 93],
        [6, 58, 36, 2, 59, 37],
        [4, 46, 20, 6, 47, 21],
        [7, 42, 14, 4, 43, 15],

        // 13
        [4, 133, 107],
        [8, 59, 37, 1, 60, 38],
        [8, 44, 20, 4, 45, 21],
        [12, 33, 11, 4, 34, 12],

        // 14
        [3, 145, 115, 1, 146, 116],
        [4, 64, 40, 5, 65, 41],
        [11, 36, 16, 5, 37, 17],
        [11, 36, 12, 5, 37, 13],

        // 15
        [5, 109, 87, 1, 110, 88],
        [5, 65, 41, 5, 66, 42],
        [5, 54, 24, 7, 55, 25],
        [11, 36, 12, 7, 37, 13],

        // 16
        [5, 122, 98, 1, 123, 99],
        [7, 73, 45, 3, 74, 46],
        [15, 43, 19, 2, 44, 20],
        [3, 45, 15, 13, 46, 16],

        // 17
        [1, 135, 107, 5, 136, 108],
        [10, 74, 46, 1, 75, 47],
        [1, 50, 22, 15, 51, 23],
        [2, 42, 14, 17, 43, 15],

        // 18
        [5, 150, 120, 1, 151, 121],
        [9, 69, 43, 4, 70, 44],
        [17, 50, 22, 1, 51, 23],
        [2, 42, 14, 19, 43, 15],

        // 19
        [3, 141, 113, 4, 142, 114],
        [3, 70, 44, 11, 71, 45],
        [17, 47, 21, 4, 48, 22],
        [9, 39, 13, 16, 40, 14],

        // 20
        [3, 135, 107, 5, 136, 108],
        [3, 67, 41, 13, 68, 42],
        [15, 54, 24, 5, 55, 25],
        [15, 43, 15, 10, 44, 16],

        // 21
        [4, 144, 116, 4, 145, 117],
        [17, 68, 42],
        [17, 50, 22, 6, 51, 23],
        [19, 46, 16, 6, 47, 17],

        // 22
        [2, 139, 111, 7, 140, 112],
        [17, 74, 46],
        [7, 54, 24, 16, 55, 25],
        [34, 37, 13],

        // 23
        [4, 151, 121, 5, 152, 122],
        [4, 75, 47, 14, 76, 48],
        [11, 54, 24, 14, 55, 25],
        [16, 45, 15, 14, 46, 16],

        // 24
        [6, 147, 117, 4, 148, 118],
        [6, 73, 45, 14, 74, 46],
        [11, 54, 24, 16, 55, 25],
        [30, 46, 16, 2, 47, 17],

        // 25
        [8, 132, 106, 4, 133, 107],
        [8, 75, 47, 13, 76, 48],
        [7, 54, 24, 22, 55, 25],
        [22, 45, 15, 13, 46, 16],

        // 26
        [10, 142, 114, 2, 143, 115],
        [19, 74, 46, 4, 75, 47],
        [28, 50, 22, 6, 51, 23],
        [33, 46, 16, 4, 47, 17],

        // 27
        [8, 152, 122, 4, 153, 123],
        [22, 73, 45, 3, 74, 46],
        [8, 53, 23, 26, 54, 24],
        [12, 45, 15, 28, 46, 16],

        // 28
        [3, 147, 117, 10, 148, 118],
        [3, 73, 45, 23, 74, 46],
        [4, 54, 24, 31, 55, 25],
        [11, 45, 15, 31, 46, 16],

        // 29
        [7, 146, 116, 7, 147, 117],
        [21, 73, 45, 7, 74, 46],
        [1, 53, 23, 37, 54, 24],
        [19, 45, 15, 26, 46, 16],

        // 30
        [5, 145, 115, 10, 146, 116],
        [19, 75, 47, 10, 76, 48],
        [15, 54, 24, 25, 55, 25],
        [23, 45, 15, 25, 46, 16],

        // 31
        [13, 145, 115, 3, 146, 116],
        [2, 74, 46, 29, 75, 47],
        [42, 54, 24, 1, 55, 25],
        [23, 45, 15, 28, 46, 16],

        // 32
        [17, 145, 115],
        [10, 74, 46, 23, 75, 47],
        [10, 54, 24, 35, 55, 25],
        [19, 45, 15, 35, 46, 16],

        // 33
        [17, 145, 115, 1, 146, 116],
        [14, 74, 46, 21, 75, 47],
        [29, 54, 24, 19, 55, 25],
        [11, 45, 15, 46, 46, 16],

        // 34
        [13, 145, 115, 6, 146, 116],
        [14, 74, 46, 23, 75, 47],
        [44, 54, 24, 7, 55, 25],
        [59, 46, 16, 1, 47, 17],

        // 35
        [12, 151, 121, 7, 152, 122],
        [12, 75, 47, 26, 76, 48],
        [39, 54, 24, 14, 55, 25],
        [22, 45, 15, 41, 46, 16],

        // 36
        [6, 151, 121, 14, 152, 122],
        [6, 75, 47, 34, 76, 48],
        [46, 54, 24, 10, 55, 25],
        [2, 45, 15, 64, 46, 16],

        // 37
        [17, 152, 122, 4, 153, 123],
        [29, 74, 46, 14, 75, 47],
        [49, 54, 24, 10, 55, 25],
        [24, 45, 15, 46, 46, 16],

        // 38
        [4, 152, 122, 18, 153, 123],
        [13, 74, 46, 32, 75, 47],
        [48, 54, 24, 14, 55, 25],
        [42, 45, 15, 32, 46, 16],

        // 39
        [20, 147, 117, 4, 148, 118],
        [40, 75, 47, 7, 76, 48],
        [43, 54, 24, 22, 55, 25],
        [10, 45, 15, 67, 46, 16],

        // 40
        [19, 148, 118, 6, 149, 119],
        [18, 75, 47, 31, 76, 48],
        [34, 54, 24, 34, 55, 25],
        [20, 45, 15, 61, 46, 16],
    ];

    constructor(
        public totalCount: number,
        public dataCount: number,
    ) { }

    public static qrRSBlock(totalCount: number, dataCount: number): QRRSBlock {
        return new QRRSBlock(totalCount, dataCount);
    };

    public static getRsBlockTable(typeNumber: number, errorCorrectionLevel: number) {
        switch (errorCorrectionLevel) {
            case QRErrorCorrectionLevel.L:
                return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
            case QRErrorCorrectionLevel.M:
                return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
            case QRErrorCorrectionLevel.Q:
                return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
            case QRErrorCorrectionLevel.H:
                return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
            default:
                return undefined;
        }
    };

    public static getRSBlocks(typeNumber: number, errorCorrectionLevel: number): QRRSBlock[] {
        const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectionLevel);

        if (typeof rsBlock == 'undefined') {
            throw 'bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel;
        }

        const length = rsBlock.length / 3;

        const list: QRRSBlock[] = [];

        for (let i = 0; i < length; i += 1) {
            const count = rsBlock[i * 3 + 0];
            const totalCount = rsBlock[i * 3 + 1];
            const dataCount = rsBlock[i * 3 + 2];

            for (let j = 0; j < count; j += 1) {
                list.push(QRRSBlock.qrRSBlock(totalCount, dataCount));
            }
        }

        return list;
    };
}

//---------------------------------------------------------------------
// qrBitBuffer
//---------------------------------------------------------------------

class QRBitBuffer {
    private readonly _buffer: number[] = [];
    private _length = 0;

    public getBuffer(): number[] {
        return this._buffer;
    };

    public getAt(index: number): boolean {
        const bufIndex = Math.floor(index / 8);
        return ((this._buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1;
    };

    public put(num: number, length: number) {
        for (let i = 0; i < length; i += 1) {
            this.putBit(((num >>> (length - i - 1)) & 1) == 1);
        }
    };

    public getLengthInBits(): number {
        return this._length;
    };

    public putBit(bit: boolean) {
        const bufIndex = Math.floor(this._length / 8);
        if (this._buffer.length <= bufIndex) {
            this._buffer.push(0);
        }

        if (bit) {
            this._buffer[bufIndex] |= (0x80 >>> (this._length % 8));
        }

        this._length += 1;
    };
};

//---------------------------------------------------------------------
// qrNumber
//---------------------------------------------------------------------

class QRNumber implements QRData {
    constructor(private readonly _data: string) { }

    public getMode() {
        return QRMode.NUMBER;
    };

    public getLength() {
        return this._data.length;
    };

    public write(buffer: QRBitBuffer) {
        const data = this._data;

        let i = 0;

        while (i + 2 < data.length) {
            buffer.put(this.strToNum(data.substring(i, i + 3)), 10);
            i += 3;
        }

        if (i < data.length) {
            if (data.length - i == 1) {
                buffer.put(this.strToNum(data.substring(i, i + 1)), 4);
            } else if (data.length - i == 2) {
                buffer.put(this.strToNum(data.substring(i, i + 2)), 7);
            }
        }
    };

    private strToNum(s: string) {
        let num = 0;
        for (let i = 0; i < s.length; i += 1) {
            num = num * 10 + this.charToNum(s.charAt(i));
        }
        return num;
    };

    private charToNum(c: string) {
        if ('0' <= c && c <= '9') {
            return c.charCodeAt(0) - '0'.charCodeAt(0);
        }
        throw 'illegal char :' + c;
    };
};

//---------------------------------------------------------------------
// qrAlphaNum
//---------------------------------------------------------------------

class QRAlphaNum implements QRData {
    constructor(private data: string) { }

    public getMode() {
        return QRMode.ALPHA_NUM;
    };

    public getLength() {
        return this.data.length;
    };

    public write(buffer: QRBitBuffer) {
        const s = this.data;

        let i = 0;

        while (i + 1 < s.length) {
            buffer.put(
                this.getCode(s.charAt(i)) * 45 +
                this.getCode(s.charAt(i + 1)), 11);
            i += 2;
        }

        if (i < s.length) {
            buffer.put(this.getCode(s.charAt(i)), 6);
        }
    };

    public getCode(c: string) {
        if ('0' <= c && c <= '9') {
            return c.charCodeAt(0) - '0'.charCodeAt(0);
        } else if ('A' <= c && c <= 'Z') {
            return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
        } else {
            switch (c) {
                case '\u0020': return 36;
                case '$': return 37;
                case '%': return 38;
                case '*': return 39;
                case '+': return 40;
                case '-': return 41;
                case '.': return 42;
                case '/': return 43;
                case ':': return 44;
                default:
                    throw 'illegal char :' + c;
            }
        }
    };
};

//---------------------------------------------------------------------
// qr8BitByte
//---------------------------------------------------------------------

class QR8BitByte implements QRData {
    private readonly _bytes: number[];

    constructor(data: string) {
        this._bytes = stringToBytes(data);
    }

    public getMode(): number {
        return QRMode.BYTE;
    };

    public getLength(): number {
        return this._bytes.length;
    };

    public write(buffer: QRBitBuffer) {
        for (let i = 0; i < this._bytes.length; i += 1) {
            buffer.put(this._bytes[i], 8);
        }
    };
};

class QRRawData implements QRData {
    constructor(
        public readonly mode: number,
        public readonly length: number,
        public readonly values: boolean[],
    ) { }

    public getMode(): number {
        return this.mode;
    };

    public getLength(): number {
        return this.length;
    };

    public write(buffer: QRBitBuffer) {
        for (let i = 0; i < this.values.length; i += 1) {
            buffer.putBit(this.values[i]);
        }
    };
};

class Base64DecodeInputStream {
    constructor(private readonly _str: string) { }

    private _pos = 0;
    private _buffer = 0;
    private _buflen = 0;

    public read() {
        while (this._buflen < 8) {
            if (this._pos >= this._str.length) {
                if (this._buflen == 0) {
                    return -1;
                }
                throw 'unexpected end of file./' + this._buflen;
            }

            const c = this._str.charAt(this._pos);
            this._pos += 1;

            if (c == '=') {
                this._buflen = 0;
                return -1;
            } else if (c.match(/^\s$/)) {
                // ignore if whitespace.
                continue;
            }

            this._buffer = (this._buffer << 6) | this.decode(c.charCodeAt(0));
            this._buflen += 6;
        }

        const n = (this._buffer >>> (this._buflen - 8)) & 0xff;
        this._buflen -= 8;
        return n;
    };

    public decode(c: number) {
        if (0x41 <= c && c <= 0x5a) {
            return c - 0x41;
        } else if (0x61 <= c && c <= 0x7a) {
            return c - 0x61 + 26;
        } else if (0x30 <= c && c <= 0x39) {
            return c - 0x30 + 52;
        } else if (c == 0x2b) {
            return 62;
        } else if (c == 0x2f) {
            return 63;
        } else {
            throw 'c:' + c;
        }
    };
};

/**
 * @param unicodeData base64 string of byte array.
 * [16bit Unicode],[16bit Bytes], ...
 * @param numChars
 */
function createStringToBytes(unicodeData: string, numChars: number) {
    // create conversion map.

    const unicodeMap = function () {
        const bin = new Base64DecodeInputStream(unicodeData);
        const read = function () {
            const b = bin.read();
            if (b == -1) throw 'eof';
            return b;
        };

        let count = 0;
        const unicodeMap: { [key: string]: number } = {};
        while (true) {
            const b0 = bin.read();
            if (b0 == -1) break;
            const b1 = read();
            const b2 = read();
            const b3 = read();
            const k = String.fromCharCode((b0 << 8) | b1);
            const v = (b2 << 8) | b3;
            unicodeMap[k] = v;
            count += 1;
        }
        if (count != numChars) {
            throw count + ' != ' + numChars;
        }

        return unicodeMap;
    }();

    const unknownChar = '?'.charCodeAt(0);

    return (s: string) => {
        const bytes: number[] = [];
        for (let i = 0; i < s.length; i += 1) {
            const c = s.charCodeAt(i);
            if (c < 128) {
                bytes.push(c);
            } else {
                const b = unicodeMap[s.charAt(i)];
                if (typeof b == 'number') {
                    if ((b & 0xff) == b) {
                        // 1byte
                        bytes.push(b);
                    } else {
                        // 2bytes
                        bytes.push(b >>> 8);
                        bytes.push(b & 0xff);
                    }
                } else {
                    bytes.push(unknownChar);
                }
            }
        }
        return bytes;
    };
}

;

export {
    createStringToBytes, QRCode,
    stringToBytes,
};

