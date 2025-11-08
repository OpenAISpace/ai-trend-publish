import { WorkflowType } from "@src/types/workflows.ts";

export interface WorkflowPreset {
  id: WorkflowType;
  name: string;
  description: string;
  defaultCron: string;
  timezone: string;
}

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: WorkflowType.WeixinArticle,
    name: "Weixin Article",
    description: "每日精选技术文章采集并推送公众号",
    defaultCron: "0 3 * * *",
    timezone: "Asia/Shanghai",
  },
  {
    id: WorkflowType.WeixinAIBench,
    name: "Weixin AI Bench",
    description: "AIBench 报告同步与总结",
    defaultCron: "0 12 * * 1,3,5",
    timezone: "Asia/Shanghai",
  },
  {
    id: WorkflowType.WeixinHelloGithub,
    name: "Hello GitHub Picks",
    description: "自动汇总 HelloGitHub 人气项目",
    defaultCron: "0 9 * * 2,4",
    timezone: "Asia/Shanghai",
  },
];

export const WORKFLOW_PRESET_MAP = new Map(
  WORKFLOW_PRESETS.map((preset) => [preset.id, preset]),
);
