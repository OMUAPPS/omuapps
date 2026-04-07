export function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

// --- Constants ---
const EPOCH_OFFSET = 946684800000;

let counter = 0;
export function generateUid(): string {
    const count = counter++;
    const timestamp = Date.now() - EPOCH_OFFSET;
    return (timestamp + count).toString(36);
}
