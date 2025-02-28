type QRiousStatic = {
    new (options?: QRiousOptions): QRiousStatic;
    toDataURL(mime?: string): string;
    set(options: QRiousOptions): void;
}

type CorrectionLevel = 'L' | 'M' | 'Q' | 'H' | string;

interface QRiousOptions {
    background?: string;
    backgroundAlpha?: number;
    foreground?: string;
    foregroundAlpha?: number;
    level?: CorrectionLevel;
    padding?: number;
    size?: number;
    value?: string;
}

declare module 'qrious' {
    export = QRious;
}

declare let QRious: QRiousStatic;
