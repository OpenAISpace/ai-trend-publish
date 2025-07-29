import { Logger } from "@src/utils/logger-adapter.ts";

const logger = new Logger("workflow-metrics");

export interface StepMetric {
  stepId: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: "success" | "failure";
  attempts: number;
  error?: string;
}

export interface WorkflowMetric {
  eventId: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: "success" | "failure";
  steps: StepMetric[];
  error?: string;
}

export class MetricsCollector {
  // 两层Map: workflowId -> eventId -> WorkflowMetric
  private metrics: Map<string, Map<string, WorkflowMetric>> = new Map();

  startWorkflow(workflowId: string, eventId: string): void {
    if (!this.metrics.has(workflowId)) {
      this.metrics.set(workflowId, new Map());
    }

    const workflowMetrics = this.metrics.get(workflowId)!;
    workflowMetrics.set(eventId, {
      eventId,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      status: "success",
      steps: [],
    });
    logger.info(`Workflow ${workflowId} event ${eventId} started`);
  }

  endWorkflow(workflowId: string, eventId: string, error?: Error): void {
    const workflowMetrics = this.metrics.get(workflowId);
    if (!workflowMetrics) return;

    const metric = workflowMetrics.get(eventId);
    if (!metric) return;

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    if (error) {
      metric.status = "failure";
      metric.error = error.message;
      logger.error(
        `Workflow ${workflowId} event ${eventId} failed: ${error.message}`,
      );
    } else {
      logger.info(
        `Workflow ${workflowId} event ${eventId} completed successfully`,
      );
    }

    // 计算统计信息
    const stats = this.calculateStats(metric);
    logger.info(`Workflow ${workflowId} event ${eventId} statistics:`, stats);
  }

  recordStep(
    workflowId: string,
    eventId: string,
    stepMetric: Omit<StepMetric, "duration">,
  ): void {
    const workflowMetrics = this.metrics.get(workflowId);
    if (!workflowMetrics) return;

    const metric = workflowMetrics.get(eventId);
    if (!metric) return;

    const duration = stepMetric.endTime - stepMetric.startTime;
    const fullStepMetric: StepMetric = {
      ...stepMetric,
      duration,
    };

    metric.steps.push(fullStepMetric);
  }

  getWorkflowEventMetrics(
    workflowId: string,
    eventId: string,
  ): WorkflowMetric | undefined {
    return this.metrics.get(workflowId)?.get(eventId);
  }

  getAllWorkflowEventMetrics(workflowId: string): WorkflowMetric[] {
    const workflowMetrics = this.metrics.get(workflowId);
    if (!workflowMetrics) return [];
    return Array.from(workflowMetrics.values());
  }

  getAllWorkflowMetrics(): WorkflowMetric[] {
    return Array.from(this.metrics.values()).flatMap((workflowMetrics) =>
      Array.from(workflowMetrics.values())
    );
  }

  private calculateStats(metric: WorkflowMetric) {
    const steps = metric.steps;
    const totalSteps = steps.length;
    const failedSteps = steps.filter((s) => s.status === "failure").length;
    const totalAttempts = steps.reduce((sum, s) => sum + s.attempts, 0);
    const avgDuration = steps.reduce((sum, s) => sum + s.duration, 0) /
      totalSteps;

    return {
      totalSteps,
      failedSteps,
      successRate: ((totalSteps - failedSteps) / totalSteps) * 100,
      totalAttempts,
      avgAttemptsPerStep: totalAttempts / totalSteps,
      avgStepDuration: avgDuration,
      totalDuration: metric.duration,
    };
  }
}
