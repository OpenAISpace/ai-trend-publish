import time
import logging
from typing import Callable, TypeVar, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from src.utils.errors import WorkflowTerminateError

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

T = TypeVar('T')

@dataclass
class RetryStats:
    attempts: int = 0
    total_delay: float = 0.0
    success: bool = False
    last_error: Optional[Exception] = None
    results: Any = None

@dataclass
class RetryOptions:
    max_attempts: int = 3
    delay_ms: int = 1000
    backoff_factor: float = 2.0  # Exponential backoff factor
    max_delay_ms: int = 30000    # Maximum delay between retries
    log_retries: bool = True

class RetryUtil:
    @staticmethod
    def retry_operation_sync(
        operation: Callable[[], T],
        options: Optional[RetryOptions] = None
    ) -> T:
        """
        Retries a synchronous operation based on the provided options.
        """
        current_options = options if options else RetryOptions()
        current_delay_ms = float(current_options.delay_ms)
        last_exception: Optional[Exception] = None

        for attempt in range(current_options.max_attempts):
            try:
                return operation()
            except WorkflowTerminateError as wte:
                logger.error(f"WorkflowTerminateError caught on attempt {attempt + 1}: {wte}. No more retries.")
                raise  # Re-raise the exception to stop further processing
            except Exception as e:
                last_exception = e
                if current_options.log_retries:
                    logger.warning(
                        f"Attempt {attempt + 1} failed: {type(e).__name__}: {e}. "
                        f"Retrying in {current_delay_ms / 1000:.2f} seconds..."
                    )

                if attempt < current_options.max_attempts - 1:
                    time.sleep(current_delay_ms / 1000.0)
                    current_delay_ms = min(
                        current_delay_ms * current_options.backoff_factor,
                        float(current_options.max_delay_ms)
                    )
                else:
                    logger.error(
                        f"Operation failed after {current_options.max_attempts} attempts. "
                        f"Last error: {type(e).__name__}: {e}"
                    )
                    raise e  # Re-raise the last exception after all attempts are exhausted
        
        # This part should ideally not be reached if max_attempts > 0,
        # as the loop will either return a result or raise an exception.
        # However, to satisfy type hinting and guard against max_attempts = 0:
        if last_exception:
            raise last_exception
        else:
            # Should not happen in practice with max_attempts > 0
            raise RuntimeError("Retry operation failed without a clear exception.")


    @staticmethod
    def retry_operation_with_stats_sync(
        operation: Callable[[], T],
        options: Optional[RetryOptions] = None
    ) -> RetryStats:
        """
        Retries a synchronous operation and returns detailed statistics about the retries.
        """
        current_options = options if options else RetryOptions()
        stats = RetryStats()
        current_delay_ms = float(current_options.delay_ms)

        for attempt_num in range(current_options.max_attempts):
            stats.attempts = attempt_num + 1
            try:
                result = operation()
                stats.success = True
                stats.results = result
                return stats
            except WorkflowTerminateError as wte:
                logger.error(
                    f"WorkflowTerminateError caught on attempt {stats.attempts}: {wte}. No more retries."
                )
                stats.last_error = wte
                # Do not re-raise here, the stats object will indicate failure
                return stats
            except Exception as e:
                stats.last_error = e
                if current_options.log_retries:
                    logger.warning(
                        f"Attempt {stats.attempts} for stats failed: {type(e).__name__}: {e}. "
                        f"Retrying in {current_delay_ms / 1000:.2f} seconds..."
                    )

                if stats.attempts < current_options.max_attempts:
                    time.sleep(current_delay_ms / 1000.0)
                    stats.total_delay += current_delay_ms / 1000.0
                    current_delay_ms = min(
                        current_delay_ms * current_options.backoff_factor,
                        float(current_options.max_delay_ms)
                    )
                else:
                    logger.error(
                        f"Operation for stats failed after {current_options.max_attempts} attempts. "
                        f"Last error: {type(e).__name__}: {e}"
                    )
                    # Do not re-raise here, the stats object will indicate failure
                    return stats
        return stats # Should be reached if max_attempts is 0 or very specific unhandled cases

if __name__ == '__main__':
    # Example Usage
    def flaky_operation_success():
        print("Attempting flaky_operation_success...")
        if RetryUtil.flaky_operation_success.attempts < 2:
            RetryUtil.flaky_operation_success.attempts += 1
            raise ValueError("Simulated temporary error")
        print("flaky_operation_success succeeded!")
        return "Success!"
    RetryUtil.flaky_operation_success.attempts = 0

    def flaky_operation_fail():
        print("Attempting flaky_operation_fail...")
        raise ConnectionError("Simulated persistent connection error")

    def workflow_terminate_op():
        print("Attempting workflow_terminate_op...")
        raise WorkflowTerminateError("Stopping due to critical workflow error", original_exception=ValueError("Original cause"))

    print("\n--- Testing retry_operation_sync (expected success) ---")
    try:
        result = RetryUtil.retry_operation_sync(flaky_operation_success, RetryOptions(delay_ms=100))
        print(f"Result: {result}")
    except Exception as e:
        print(f"Caught exception: {e}")

    RetryUtil.flaky_operation_success.attempts = 0 # Reset for next test

    print("\n--- Testing retry_operation_sync (expected failure) ---")
    try:
        RetryUtil.retry_operation_sync(flaky_operation_fail, RetryOptions(max_attempts=2, delay_ms=50))
    except Exception as e:
        print(f"Caught expected exception: {type(e).__name__}: {e}")

    print("\n--- Testing retry_operation_sync (WorkflowTerminateError) ---")
    try:
        RetryUtil.retry_operation_sync(workflow_terminate_op, RetryOptions(delay_ms=50))
    except WorkflowTerminateError as e:
        print(f"Caught expected WorkflowTerminateError: {e}")
    except Exception as e:
        print(f"Caught unexpected exception: {e}")


    print("\n--- Testing retry_operation_with_stats_sync (expected success) ---")
    RetryUtil.flaky_operation_success.attempts = 0
    stats_success = RetryUtil.retry_operation_with_stats_sync(flaky_operation_success, RetryOptions(delay_ms=100))
    print(f"Stats (Success): {stats_success}")


    print("\n--- Testing retry_operation_with_stats_sync (expected failure) ---")
    stats_fail = RetryUtil.retry_operation_with_stats_sync(flaky_operation_fail, RetryOptions(max_attempts=2, delay_ms=50))
    print(f"Stats (Failure): {stats_fail}")

    print("\n--- Testing retry_operation_with_stats_sync (WorkflowTerminateError) ---")
    stats_terminate = RetryUtil.retry_operation_with_stats_sync(workflow_terminate_op, RetryOptions(delay_ms=50))
    print(f"Stats (WorkflowTerminateError): {stats_terminate}")

    def no_error_op():
        print("Executing no_error_op")
        return "No error result"

    print("\n--- Testing retry_operation_sync (no error) ---")
    result_no_error = RetryUtil.retry_operation_sync(no_error_op, RetryOptions(delay_ms=50))
    print(f"Result (No Error): {result_no_error}")

    print("\n--- Testing retry_operation_with_stats_sync (no error) ---")
    stats_no_error = RetryUtil.retry_operation_with_stats_sync(no_error_op, RetryOptions(delay_ms=50))
    print(f"Stats (No Error): {stats_no_error}")
