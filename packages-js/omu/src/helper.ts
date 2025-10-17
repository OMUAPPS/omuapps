type Ok<T> = {
    ok: true;
    data: T;
};
type Err<E> = {
    ok: false;
    data: E;
};

export function tryCatch<T, E = Error>(func: () => T): Ok<T> | Err<E> {
    try {
        return { ok: true, data: func() };
    } catch (e) {
        return { ok: false, data: e as E };
    }
}
