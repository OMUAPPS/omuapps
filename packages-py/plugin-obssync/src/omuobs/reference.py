from collections.abc import Callable


class Reference[T]:
    def __init__(
        self,
        release: Callable[[T], None],
        ref: T,
    ):
        assert ref is not None, "Reference cannot be None"
        self.release = release
        self._ref: T | None = ref
        self.ref_count = 0

    def __enter__(self) -> T:
        if self._ref is None:
            raise ValueError("Reference is already released")
        self.ref_count += 1
        return self._ref

    def __exit__(self, exc_type, exc_value, traceback):
        self.ref_count -= 1

    def __del__(self):
        if self._ref is None:
            raise ValueError("Reference is already released")
        if self.ref_count > 0:
            return
        self.release(self._ref)
