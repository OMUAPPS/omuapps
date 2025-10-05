export function mapOptional<T, R>(value: T | undefined | null, func: (value: T) => R): R | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    return func(value);
}
