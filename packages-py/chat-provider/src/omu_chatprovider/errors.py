class ProviderError(Exception):
    """Base class for provider errors."""

    pass


class ProviderTemporarilyUnavailable(ProviderError):
    """The provider could not be checked; this does not establish that it is offline."""
