import { WorkflowType } from "@src/types/workflows.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";

export interface DailyWorkflowConfig {
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  workflowType: WorkflowType;
  isEnabled: boolean;
}

export class WorkflowConfigService {
  private static instance: WorkflowConfigService;
  private constructor() {}

  public static getInstance(): WorkflowConfigService {
    if (!WorkflowConfigService.instance) {
      WorkflowConfigService.instance = new WorkflowConfigService();
    }
    return WorkflowConfigService.instance;
  }

  async getDailyWorkflow(
    dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  ): Promise<WorkflowType | null> {
    try {
      const workflowType = await ConfigManager.getInstance().get<string>(
        `${dayOfWeek}_of_week_workflow`,
      );
      return workflowType
        ? WorkflowType[workflowType as keyof typeof WorkflowType]
        : WorkflowType.WeixinArticle;
    } catch (error) {
      console.error("获取工作流配置失败", error);
      return WorkflowType.WeixinArticle;
    }
  }
}
