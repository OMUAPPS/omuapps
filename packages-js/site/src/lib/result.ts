export type Success<T> = {
    data: T;
    error: null;
};

export type Failure<E> = {
    data: null;
    error: E;
};

export type Result<T, E = Error> = Success<T> | Failure<E>;

export async function tryCatch<T, E = Error>(
    promise: Promise<T>,
): Promise<Result<T, E>> {
    try {
        const data = await promise;
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error as E };
    }
}

export function success<T>(data: T): Result<T> {
    return { data, error: null };
}

export function failure<E>(error: E): Result<null, E> {
    return { data: null, error };
}
