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

export class PromiseResult<T, E = Error> implements Promise<T> {
    private constructor(
        private readonly promise: Promise<T>,
    ) {}

    public static create<T, E = Error>(): { promise: PromiseResult<T, E>; resolve: (value: T) => void; reject: (error: E) => void } {
        let resolve: (value: T) => void = () => {};
        let reject: (error: E) => void = () => {};
        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return {
            promise: new PromiseResult<T, E>(promise),
            resolve,
            reject,
        };
    }

    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: E) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2> {
        return this.promise.then(onfulfilled, onrejected);
    }

    catch<TResult = never>(onrejected?: ((reason: E) => TResult | PromiseLike<TResult>) | null | undefined): Promise<T | TResult> {
        return this.promise.catch(onrejected);
    }

    finally(onfinally?: (() => void) | null | undefined): Promise<T> {
        return this.promise.finally(onfinally);
    }

    [Symbol.toStringTag]: string = 'ResultPromise';

    async toResult(): Promise<Result<T, E>> {
        try {
            return {
                data: await this.promise,
                error: null,
            };
        } catch (err) {
            return {
                data: null,
                error: err as E,
            };
        }
    }
}
