class WorkflowTerminateError(Exception):
    """
    Custom exception to signal that a workflow operation should be terminated
    and not retried.
    """
    def __init__(self, message="Workflow termination requested.", original_exception=None):
        super().__init__(message)
        self.original_exception = original_exception

    def __str__(self):
        if self.original_exception:
            return f"{super().__str__()} Original exception: {type(self.original_exception).__name__}: {self.original_exception}"
        return super().__str__()}

class ConfigurationError(Exception):
    """
    Custom exception for configuration related errors.
    """
    def __init__(self, message="Configuration error occurred."):
        super().__init__(message)
