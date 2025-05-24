import os
import json
from typing import Any
from dotenv import load_dotenv
from src.utils.config.config_source_interface import IConfigSource

class EnvConfigSource(IConfigSource):
    """
    Configuration source that retrieves values from environment variables
    and a .env file.
    """
    _priority: int

    def __init__(self, priority: int = 100, load_env_file: bool = True):
        """
        Initializes the EnvConfigSource.

        Args:
            priority: The priority of this configuration source.
            load_env_file: Whether to load a .env file.
        """
        self._priority = priority
        if load_env_file:
            load_dotenv() # Loads .env file into environment variables

    @property
    def priority(self) -> int:
        return self._priority

    def get(self, key: str) -> Any | None:
        """
        Retrieves a configuration value for the given key from environment variables.
        Tries to parse the value as JSON; if it fails, returns the string value.
        """
        value = os.environ.get(key)
        if value is None:
            return None

        try:
            # Attempt to parse as JSON
            return json.loads(value)
        except json.JSONDecodeError:
            # If not JSON, return the raw string value
            return value

if __name__ == '__main__':
    # Example Usage (assuming you have a .env file or set environment variables)
    # Create a dummy .env file for testing
    with open(".env", "w") as f:
        f.write("TEST_VAR_STRING=HelloEnv\n")
        f.write("TEST_VAR_JSON='{\"key\": \"value\", \"number\": 123}'\n") # Note: JSON string in .env
        f.write("TEST_VAR_NUMBER=456\n")
        f.write("TEST_VAR_BOOL=true\n")


    # Test without loading .env (relies on pre-existing env vars if any)
    # os.environ["EXISTING_VAR"] = "Pre-exists"
    # source_no_load = EnvConfigSource(load_env_file=False)
    # print(f"EXISTING_VAR (no .env load): {source_no_load.get('EXISTING_VAR')}")

    print("\n--- Testing EnvConfigSource (with .env load) ---")
    source = EnvConfigSource()
    print(f"Priority: {source.priority}")

    print(f"TEST_VAR_STRING: {source.get('TEST_VAR_STRING')} (type: {type(source.get('TEST_VAR_STRING'))})")
    
    json_val = source.get('TEST_VAR_JSON')
    print(f"TEST_VAR_JSON: {json_val} (type: {type(json_val)})")
    if isinstance(json_val, dict):
        print(f"  TEST_VAR_JSON['key']: {json_val.get('key')}")

    # Numbers from .env are read as strings, JSON parsing handles numbers within JSON strings
    print(f"TEST_VAR_NUMBER: {source.get('TEST_VAR_NUMBER')} (type: {type(source.get('TEST_VAR_NUMBER'))})")
    
    # Booleans from .env are read as strings unless part of a JSON structure
    # The get method will return "true" as a string. Users of ConfigManager
    # might need to implement their own type conversion for specific keys if not JSON.
    bool_val_str = source.get('TEST_VAR_BOOL')
    print(f"TEST_VAR_BOOL (as string): {bool_val_str} (type: {type(bool_val_str)})")
    
    # Example of how a user might convert a string to boolean
    if isinstance(bool_val_str, str):
        print(f"TEST_VAR_BOOL (converted to bool): {bool_val_str.lower() == 'true'}")
        
    print(f"NON_EXISTENT_VAR: {source.get('NON_EXISTENT_VAR')}")

    # Clean up dummy .env
    # os.remove(".env")
