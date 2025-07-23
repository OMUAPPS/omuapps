export function copy<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

let idCounter = 0;
export function uniqueId(): string {
    const now = Date.now().toString(36);
    const counter = (idCounter++).toString(36);
    return `${now}-${counter}`;
}
