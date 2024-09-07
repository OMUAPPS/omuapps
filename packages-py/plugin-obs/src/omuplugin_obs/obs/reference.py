from collections.abc import Callable

# メモリ管理出来るように作ってみたけどクラッシュするので安定した実装になるまで無効化
# 勝手に安定することを星に願おう
# https://github.com/OMUAPPS/omuapps/issues/64
ENABLE_AUTO_RELEASE = False


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
        if ENABLE_AUTO_RELEASE:
            self.release(self._ref)

    def acquire(self) -> T:
        if self._ref is None:
            raise ValueError("Reference is already released")
        self.ref_count += 1
        return self._ref
