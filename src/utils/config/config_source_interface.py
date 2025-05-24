from abc import ABC, abstractmethod
from typing import Any

class IConfigSource(ABC):
    """
    Interface for configuration sources.
    Each source provides a way to retrieve configuration values based on a key
    and has a priority to determine the order of lookup.
    """

    @property
    @abstractmethod
    def priority(self) -> int:
        """
        Priority of the configuration source.
        Lower numbers mean higher priority (looked up first).
        """
        pass

    @abstractmethod
    def get(self, key: str) -> Any | None:
        """
        Retrieves a configuration value for the given key.

        Args:
            key: The configuration key to look up.

        Returns:
            The configuration value if found, otherwise None.
            The value can be of any type, but if it's a string that
            can be parsed as JSON, it should ideally be returned as
            the parsed JSON object.
        """
        pass
