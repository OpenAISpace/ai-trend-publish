import json
from typing import Any, Callable
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from src.utils.config.config_source_interface import IConfigSource
from src.models.config import Config as ConfigModel # Renamed to avoid conflict
import logging

logger = logging.getLogger(__name__)

# Placeholder for actual session management
# This function will be implemented properly in a later subtask.
def get_db_session() -> Session | None:
    """
    Placeholder function to simulate obtaining a database session.
    In a real application, this would involve actual session management.
    For now, it can return None to simulate DB unavailability or be mocked.
    """
    logger.warning("Using placeholder get_db_session. This should be replaced with actual session management.")
    # Example:
    # from sqlalchemy import create_engine
    # from sqlalchemy.orm import sessionmaker
    # try:
    #     engine = create_engine("sqlite:///./test.db") # Replace with your actual DB URL
    #     SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    #     db = SessionLocal()
    #     return db
    # except Exception as e:
    #     logger.error(f"Failed to create placeholder DB session: {e}")
    return None


class DbConfigSource(IConfigSource):
    """
    Configuration source that retrieves values from a database table.
    """
    _priority: int
    _get_session: Callable[[], Session | None]

    def __init__(self, priority: int = 10, get_session_func: Callable[[], Session | None] = get_db_session):
        """
        Initializes the DbConfigSource.

        Args:
            priority: The priority of this configuration source.
            get_session_func: A callable that returns a SQLAlchemy Session or None.
        """
        self._priority = priority
        self._get_session = get_session_func

    @property
    def priority(self) -> int:
        return self._priority

    def get(self, key: str) -> Any | None:
        """
        Retrieves a configuration value for the given key from the database.
        Tries to parse the value as JSON; if it fails, returns the string value.
        """
        session = self._get_session()
        if session is None:
            logger.warning("DbConfigSource: Database session not available.")
            return None

        try:
            config_entry = session.query(ConfigModel).filter(ConfigModel.key == key).first()
            if config_entry:
                value = config_entry.value
                if value is None:
                    return None
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            return None
        except SQLAlchemyError as e:
            logger.error(f"DbConfigSource: Database error while fetching key '{key}': {e}")
            return None
        except Exception as e:
            logger.error(f"DbConfigSource: Unexpected error while fetching key '{key}': {e}")
            return None
        finally:
            if session:
                # In a real scenario, how the session is closed or returned to a pool
                # would depend on the session management strategy.
                # For this placeholder, we might close it if we created it,
                # but if it's from a global pool, we might not.
                # For now, if get_db_session creates it, it should handle its lifecycle.
                # If it's a placeholder returning a global session, we might not close it here.
                # session.close() # Be cautious with this line depending on session scope.
                pass


if __name__ == '__main__':
    print("\n--- Testing DbConfigSource ---")

    # Mocking a session and data for testing
    class MockQuery:
        def __init__(self, key_to_find, data):
            self.key_to_find = key_to_find
            self.data = data
        def filter(self, condition): # Simplified filter
            # This is a very basic mock. A real filter would parse the condition.
            # Here, we assume the condition is checking the key.
            return self
        def first(self):
            return self.data.get(self.key_to_find)

    class MockSession:
        def __init__(self, data_dict):
            self.data_dict = data_dict
        def query(self, model):
            # Allows us to specify which key the query is "looking for"
            # This is a bit of a hack for this mock structure
            # In a real scenario, filter would set this.
            # For now, we pass all data and filter in MockQuery.
            # Let's assume the test will set a "current_key_for_mock_query"
            # or pass it to MockQuery constructor.
            # This mock needs to be improved for more general testing.
            # For this test, let's assume the key is implicitly known by what we fetch.
            return MockQuery(self._current_key_for_test, self.data_dict) # type: ignore
        def close(self):
            print("MockSession closed.")

    mock_data = {
        "DB_VAR_STRING": ConfigModel(key="DB_VAR_STRING", value="HelloDB"),
        "DB_VAR_JSON": ConfigModel(key="DB_VAR_JSON", value='{"name": "DB Test", "version": 1.0}'),
        "DB_VAR_NUMBER_STR": ConfigModel(key="DB_VAR_NUMBER_STR", value="789"), # Stored as string
        "DB_VAR_MALFORMED_JSON": ConfigModel(key="DB_VAR_MALFORMED_JSON", value='{"name": "DB Test", "version": 1.0') # Missing closing }
    }

    def mock_get_session_success():
        print("mock_get_session_success called")
        session = MockSession(mock_data)
        return session #type: ignore

    def mock_get_session_fail():
        print("mock_get_session_fail called")
        return None

    print("\n--- Test with successful DB connection ---")
    db_source_success = DbConfigSource(priority=10, get_session_func=mock_get_session_success)
    
    # Hacky way to tell MockSession what key we are testing
    mock_get_session_success()._current_key_for_test = "DB_VAR_STRING" #type: ignore
    print(f"DB_VAR_STRING: {db_source_success.get('DB_VAR_STRING')} (type: {type(db_source_success.get('DB_VAR_STRING'))})")
    
    mock_get_session_success()._current_key_for_test = "DB_VAR_JSON" #type: ignore
    json_val_db = db_source_success.get('DB_VAR_JSON')
    print(f"DB_VAR_JSON: {json_val_db} (type: {type(json_val_db)})")
    if isinstance(json_val_db, dict):
        print(f"  DB_VAR_JSON['name']: {json_val_db.get('name')}")

    mock_get_session_success()._current_key_for_test = "DB_VAR_NUMBER_STR" #type: ignore
    print(f"DB_VAR_NUMBER_STR: {db_source_success.get('DB_VAR_NUMBER_STR')} (type: {type(db_source_success.get('DB_VAR_NUMBER_STR'))})")

    mock_get_session_success()._current_key_for_test = "DB_VAR_MALFORMED_JSON" #type: ignore
    print(f"DB_VAR_MALFORMED_JSON: {db_source_success.get('DB_VAR_MALFORMED_JSON')} (type: {type(db_source_success.get('DB_VAR_MALFORMED_JSON'))})")
    
    mock_get_session_success()._current_key_for_test = "NON_EXISTENT_DB_VAR" #type: ignore
    print(f"NON_EXISTENT_DB_VAR: {db_source_success.get('NON_EXISTENT_DB_VAR')}")

    print("\n--- Test with failed DB connection ---")
    db_source_fail = DbConfigSource(priority=10, get_session_func=mock_get_session_fail)
    print(f"DB_VAR_STRING (DB fail): {db_source_fail.get('DB_VAR_STRING')}")

    # Test with actual (placeholder) get_db_session which returns None
    print("\n--- Test with placeholder get_db_session (returns None) ---")
    db_source_placeholder = DbConfigSource(priority=10) # Uses default get_db_session
    print(f"DB_VAR_STRING (placeholder DB): {db_source_placeholder.get('DB_VAR_STRING')}")
