import logging
import time
from typing import List, Any, Optional, Type
from threading import Lock

from src.utils.config.config_source_interface import IConfigSource
from src.utils.config.env_config_source import EnvConfigSource
from src.utils.config.db_config_source import DbConfigSource 
# Import get_db_session if needed by DbConfigSource directly, or assume it's handled within DbConfigSource
from src.utils.errors import ConfigurationError

logger = logging.getLogger(__name__)

class ConfigManager:
    """
    Manages configuration from various sources. Implemented as a singleton.
    """
    _instance: Optional["ConfigManager"] = None
    _lock: Lock = Lock()

    _sources: List[IConfigSource]
    _initialized_default_sources: bool = False

    def __new__(cls, *args, **kwargs) -> "ConfigManager":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._sources = []
                    cls._instance._initialized_default_sources = False
        return cls._instance

    def add_source(self, source: IConfigSource) -> None:
        """Adds a configuration source and sorts sources by priority."""
        if not isinstance(source, IConfigSource):
            raise TypeError("Source must implement IConfigSource")
        
        # Prevent adding the same source instance multiple times
        if source not in self._sources:
            self._sources.append(source)
            self._sources.sort(key=lambda s: s.priority)
            logger.info(f"Added config source: {source.__class__.__name__} with priority {source.priority}")
        else:
            logger.warning(f"Config source {source.__class__.__name__} already added.")


    def get_sources(self) -> List[IConfigSource]:
        """Returns a list of current configuration sources, sorted by priority."""
        return self._sources

    def clear_sources(self) -> None:
        """Clears all configuration sources."""
        self._sources = []
        self._initialized_default_sources = False
        logger.info("All config sources cleared.")

    def get(self, key: str, default_value: Any = None, retries: int = 3, delay_s: int = 1) -> Any | None:
        """
        Retrieves a configuration value for the given key from the registered sources.
        Sources are queried in order of their priority.
        Retries on failure to get a value (if no source returns a non-None value).
        """
        if not self._initialized_default_sources :
            # This might be problematic if init_default_config_sources itself calls get
            # For ENABLE_DB, it should be fine if EnvConfigSource is tried first.
            logger.info("ConfigManager.get() called before explicit init or add_source. "
                        "Consider calling init_default_config_sources() or adding sources manually.")
            # Potentially auto-initialize if no sources are present at all
            if not self._sources:
                logger.info("No sources found, attempting to initialize default config sources.")
                self.init_default_config_sources()


        last_exception = None
        for attempt in range(retries):
            for source in self._sources:
                try:
                    value = source.get(key)
                    if value is not None:
                        logger.debug(f"Config key '{key}' found in {source.__class__.__name__}. Value: {value}")
                        return value
                except Exception as e:
                    last_exception = e # Store last exception from a source
                    logger.warning(
                        f"Error getting key '{key}' from source {source.__class__.__name__}: {e}. "
                        f"Attempt {attempt + 1}/{retries}."
                    )
            
            if attempt < retries - 1:
                logger.info(f"Key '{key}' not found in any source on attempt {attempt + 1}. Retrying in {delay_s}s...")
                time.sleep(delay_s)
            else:
                logger.warning(f"Key '{key}' not found after {retries} attempts.")
                if last_exception: # If any source threw an error during the last attempt
                    # Not raising ConfigurationError here, as it's about not finding the key.
                    # If a source itself has a critical unrecoverable error, it should raise it.
                    pass

        if default_value is not None:
            logger.info(f"Returning default value for key '{key}': {default_value}")
            return default_value
        
        logger.warning(f"Key '{key}' not found and no default value provided.")
        return None

    def init_default_config_sources(self, env_priority: int = 100, db_priority: int = 10) -> None:
        """
        Initializes and adds default configuration sources:
        - EnvConfigSource
        - DbConfigSource (if ENABLE_DB is true, read from EnvConfigSource first)
        This method is idempotent.
        """
        if self._initialized_default_sources and any(isinstance(s, EnvConfigSource) for s in self._sources):
            logger.info("Default config sources already initialized or EnvConfigSource manually added.")
            # If we want to re-apply with different priorities, we might clear first or update existing.
            # For now, simple idempotency: if an EnvSource exists, assume defaults are set up.
            return

        logger.info("Initializing default configuration sources...")
        
        # Add EnvConfigSource first
        env_source = EnvConfigSource(priority=env_priority)
        self.add_source(env_source)

        # Check if DB configuration should be enabled, using the already added EnvSource
        # This avoids a recursive loop if ENABLE_DB itself was in the DB.
        try:
            # Temporarily use the env_source directly for this specific check
            # to avoid the full 'get' logic which might log warnings about uninitialized sources.
            enable_db_value = env_source.get("ENABLE_DB") 
            
            # Interpret common boolean string values
            if isinstance(enable_db_value, str):
                enable_db = enable_db_value.lower() in ['true', '1', 'yes']
            elif isinstance(enable_db_value, bool):
                enable_db = enable_db_value
            else: # None or other types
                enable_db = False 
                logger.info("'ENABLE_DB' not found or not a recognized boolean in environment variables. Defaulting to False.")

            if enable_db:
                logger.info("ENABLE_DB is true, adding DbConfigSource.")
                # Here, DbConfigSource will use its default get_db_session or one passed to it.
                db_source = DbConfigSource(priority=db_priority) 
                self.add_source(db_source)
            else:
                logger.info("ENABLE_DB is false or not set in environment. DbConfigSource will not be added by default.")
        except Exception as e:
            logger.error(f"Failed to check ENABLE_DB or initialize DbConfigSource: {e}")
            # Potentially raise ConfigurationError if this is critical
            # raise ConfigurationError(f"Error initializing default DbConfigSource: {e}") from e

        self._initialized_default_sources = True
        logger.info("Default configuration sources initialization complete.")


    @classmethod
    def get_instance(cls) -> "ConfigManager":
        """Provides access to the singleton instance."""
        if cls._instance is None:
            cls._instance = cls() # Will call __new__ and then __init__ if overridden
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Resets the singleton instance. Useful for testing."""
        with cls._lock:
            cls._instance = None
            logger.info("ConfigManager instance has been reset.")


# Global instance for easy access
config_manager = ConfigManager.get_instance()

if __name__ == '__main__':
    # Example Usage
    ConfigManager.reset_instance() # Reset for clean testing
    manager = ConfigManager.get_instance()

    # 1. Initialize default sources (assuming .env might have ENABLE_DB)
    # Create a dummy .env for this test
    with open(".env", "w") as f:
        f.write("MY_ENV_VAR=Hello from .env\n")
        f.write("ENABLE_DB=false\n") # Test with DB disabled first
        f.write("SHARED_KEY=EnvValueForKey\n")
        f.write("COMPLEX_JSON_ENV='{\"setting\": \"on\", \"level\": 5}'\n")

    print("\n--- Initializing default sources (ENABLE_DB=false) ---")
    manager.init_default_config_sources()
    print(f"Sources after init: {[s.__class__.__name__ for s in manager.get_sources()]}")
    print(f"MY_ENV_VAR: {manager.get('MY_ENV_VAR')}")
    print(f"COMPLEX_JSON_ENV: {manager.get('COMPLEX_JSON_ENV')}")
    print(f"SHARED_KEY: {manager.get('SHARED_KEY')}") # Should be from Env

    # Test with ENABLE_DB=true
    ConfigManager.reset_instance()
    manager = ConfigManager.get_instance()
    with open(".env", "w") as f:
        f.write("MY_ENV_VAR=Hello again from .env\n")
        f.write("ENABLE_DB=true\n")
        f.write("SHARED_KEY=EnvValueAgain\n")
        f.write("DB_ONLY_KEY_IN_ENV_FOR_DB_MOCK=DB_Value_from_env_for_mock_db\n")


    # Mocking DbConfigSource's get_db_session for this test
    # In a real scenario, DbConfigSource would handle its session.
    # Here, we are testing ConfigManager's interaction.
    class MockDbConfig(IConfigSource):
        @property
        def priority(self) -> int: return 10 # Higher priority than default Env
        def get(self, key: str) -> Any | None:
            mock_db_data = {
                "MY_DB_VAR": "Hello from Mock DB",
                "SHARED_KEY": "DB_Overrides_Env", # This should override Env
                "DB_ONLY_KEY_IN_ENV_FOR_DB_MOCK": "This value should come from DB if ENABLE_DB worked" 
            }
            if key == "DB_ONLY_KEY_IN_ENV_FOR_DB_MOCK": # Simulate DB has this value
                 return mock_db_data.get(key, "Mock DB Default for this key")
            if key == "SHARED_KEY":
                return mock_db_data.get(key)
            if key == "MY_DB_VAR":
                return mock_db_data.get(key)
            return None

    original_db_config_source = DbConfigSource # Save original
    DbConfigSource = MockDbConfig # Monkeypatch for this test block

    print("\n--- Initializing default sources (ENABLE_DB=true, with Mocked DbConfigSource) ---")
    manager.init_default_config_sources() # This will now use MockDbConfig if ENABLE_DB=true
    
    print(f"Sources after init (ENABLE_DB=true): {[s.__class__.__name__ for s in manager.get_sources()]}")
    print(f"MY_ENV_VAR: {manager.get('MY_ENV_VAR')}") # From Env
    print(f"MY_DB_VAR: {manager.get('MY_DB_VAR')}")   # From Mock DB
    print(f"SHARED_KEY: {manager.get('SHARED_KEY')}") # Should be from Mock DB due to priority
    print(f"DB_ONLY_KEY_IN_ENV_FOR_DB_MOCK: {manager.get('DB_ONLY_KEY_IN_ENV_FOR_DB_MOCK')}")


    # Restore original DbConfigSource
    DbConfigSource = original_db_config_source

    # Test getting a non-existent key
    print("\n--- Testing non-existent key ---")
    print(f"NON_EXISTENT_CONFIG: {manager.get('NON_EXISTENT_CONFIG', default_value='DefaultVal')}")
    print(f"NON_EXISTENT_CONFIG (no default): {manager.get('NON_EXISTENT_CONFIG')}")


    # Test clearing sources
    print("\n--- Testing clear sources ---")
    manager.clear_sources()
    print(f"Sources after clear: {manager.get_sources()}")
    print(f"MY_ENV_VAR (after clear): {manager.get('MY_ENV_VAR', 'Default after clear')}") # Should be default

    # Clean up dummy .env
    if os.path.exists(".env"):
        os.remove(".env")

    print("\n--- Test direct add_source and priority ---")
    ConfigManager.reset_instance()
    manager = ConfigManager.get_instance()
    
    class HighPrioritySource(IConfigSource):
        _priority = 1
        def get(self, key:str): return "from_high" if key == "PRIO_TEST" else None
    class LowPrioritySource(IConfigSource):
        _priority = 200
        def get(self, key:str): return "from_low" if key == "PRIO_TEST" else None

    manager.add_source(LowPrioritySource())
    manager.add_source(HighPrioritySource()) # Added second, but higher priority
    
    print(f"Sources for priority test: {[s.__class__.__name__ for s in manager.get_sources()]}")
    print(f"PRIO_TEST: {manager.get('PRIO_TEST')}") # Should be 'from_high'

    print("\n--- Test ConfigManager as a global singleton ---")
    manager1 = ConfigManager.get_instance()
    manager2 = ConfigManager.get_instance()
    manager1.clear_sources() # Clear sources using one instance
    manager2.add_source(EnvConfigSource(priority=5)) # Add source using another
    # Create dummy .env for this
    with open(".env", "w") as f: f.write("SINGLETON_TEST=SingletonOK\n")
    # EnvConfigSource loads .env on init, so this new one should pick it up
    
    # Ensure the global config_manager instance also reflects this
    print(f"SINGLETON_TEST from global config_manager: {config_manager.get('SINGLETON_TEST')}")
    print(f"manager1 is manager2: {manager1 is manager2}")
    print(f"manager1 is config_manager: {manager1 is config_manager}")

    if os.path.exists(".env"):
        os.remove(".env")
