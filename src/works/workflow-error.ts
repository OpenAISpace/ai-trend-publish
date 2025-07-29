/**
 * 工作流终止错误 用于表示流程需要立即终止，不需要重试*/
export class WorkflowTerminateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowTerminateError";
  }
}

/**
 * 工作流步 骤错错误 用于表示步骤执行失败，可以 重试 */
export class WorkflowStepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowStepError";
  }
}
