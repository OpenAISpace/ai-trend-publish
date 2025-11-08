import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatedPage } from "../components/animated-page";
import { AppHeader } from "../components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Spinner } from "../components/ui/spinner";
import { useToast } from "../components/ui/toast";
import { useSession } from "../lib/session";
import { useApiClient } from "../lib/use-api-client";
import { queryKeys } from "../lib/query-keys";
import { queryClient } from "../lib/query-client";
import type { WorkflowDefinition, WorkflowStatus } from "../types";

const statusVariant: Record<WorkflowStatus, "default" | "success" | "warning" | "danger"> =
  {
    idle: "default",
    queued: "warning",
    running: "warning",
    success: "success",
    failed: "danger",
  };

const statusLabel: Record<WorkflowStatus, string> = {
  idle: "待命",
  queued: "排队中",
  running: "执行中",
  success: "成功",
  failed: "失败",
};

export function WorkflowsPage() {
  const { session } = useSession();
  const api = useApiClient();
  const { pushToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.workflows(session),
    queryFn: () => api.fetchWorkflows(),
    enabled: session.unlocked,
    refetchInterval: 15_000,
  });

  const workflows = data ?? [];
  const [selectedId, setSelectedId] = useState<string>("");
  const [payload, setPayload] = useState("{\n  \n}");

  useEffect(() => {
    if (!selectedId && workflows.length > 0) {
      setSelectedId(workflows[0].id);
    }
  }, [selectedId, workflows]);

  const selectedWorkflow = useMemo<WorkflowDefinition | undefined>(
    () => workflows.find((workflow) => workflow.id === selectedId),
    [workflows, selectedId],
  );

  const [scheduleDraft, setScheduleDraft] = useState({
    cron: "",
    timezone: "",
    isEnabled: true,
  });
  const [localRunning, setLocalRunning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedWorkflow) {
      setScheduleDraft({
        cron: selectedWorkflow.schedule.cron,
        timezone: selectedWorkflow.schedule.timezone,
        isEnabled: selectedWorkflow.schedule.isEnabled,
      });
    }
  }, [selectedWorkflow]);

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkflow) return;
      await api.updateSchedule(selectedWorkflow.id, scheduleDraft);
    },
    onSuccess: () => {
      pushToast({ title: "调度已保存", variant: "success" });
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows(session),
      });
    },
    onError: (error: unknown) => {
      pushToast({
        title: "保存调度失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "error",
      });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async (workflow: WorkflowDefinition) => {
      if (!workflow) return;
      let data: Record<string, unknown> = {};
      if (payload.trim()) {
        try {
          data = JSON.parse(payload);
        } catch {
          throw new Error("Payload 需为合法 JSON");
        }
      }
      await api.triggerWorkflow(workflow.id, data);
    },
    onMutate: async (workflow) => {
      if (workflow) {
        setLocalRunning((prev) => ({ ...prev, [workflow.id]: true }));
      }
      return { workflowId: workflow?.id };
    },
    onSuccess: () => {
      pushToast({
        title: "触发成功",
        description: "工作流已在后台运行，可前往日志或仪表盘查看进度。",
        variant: "success",
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows(session),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard(session),
      });
    },
    onError: (error: unknown) => {
      pushToast({
        title: "触发失败",
        description: error instanceof Error ? error.message : "请稍后再试",
        variant: "error",
      });
    },
    onSettled: (_, __, context) => {
      if (context?.workflowId) {
        setLocalRunning((prev) => {
          const next = { ...prev };
          delete next[context.workflowId];
          return next;
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows(session),
      });
    },
  });

  const isWorkflowBusy = selectedWorkflow
    ? selectedWorkflow.status === "running" ||
      Boolean(localRunning[selectedWorkflow.id])
    : false;

  const handleTrigger = () => {
    if (!selectedWorkflow) return;
    if (isWorkflowBusy) {
      const confirmed = window.confirm("该工作流仍在运行，确定要强制触发吗？");
      if (!confirmed) return;
    }
    triggerMutation.mutate(selectedWorkflow);
  };

  return (
    <>
      <AppHeader
        title="工作流调度"
        subtitle="查看调度窗口，更新 CRON 并按需手动触发执行"
      />
      <AnimatedPage>
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                工作流列表
              </p>
              <CardTitle className="text-xl">可用工作流</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[480px] scroll-area pr-2">
              {isLoading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  正在加载工作流...
                </p>
              )}
              {workflows.map((workflow) => (
                <button
                  key={workflow.id}
                  onClick={() => setSelectedId(workflow.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    workflow.id === selectedId
                      ? "border-white/30 bg-white/10"
                      : "border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{workflow.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {workflow.description}
                      </p>
                    </div>
                    <Badge variant={statusVariant[workflow.status] ?? "default"}>
                      {statusLabel[workflow.status]}
                    </Badge>
                  </div>
                </button>
              ))}
              {!isLoading && workflows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  暂无可用工作流。
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                调度与触发
              </p>
              <CardTitle className="text-xl">
                {selectedWorkflow?.name ?? "请选择工作流"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedWorkflow ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <StatTile
                      label="成功次数"
                      value={selectedWorkflow.stats.successCount}
                    />
                    <StatTile
                      label="失败次数"
                      value={selectedWorkflow.stats.failureCount}
                      className="text-rose-200"
                    />
                    <StatTile
                      label="平均耗时"
                      value={`${(
                        selectedWorkflow.stats.averageDurationMs / 1000
                      ).toFixed(1)}s`}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>CRON 表达式</Label>
                    <Input
                      value={scheduleDraft.cron}
                      onChange={(e) =>
                        setScheduleDraft((prev) => ({
                          ...prev,
                          cron: e.target.value,
                        }))
                      }
                    />
                    <Label>时区</Label>
                    <Input
                      value={scheduleDraft.timezone}
                      onChange={(e) =>
                        setScheduleDraft((prev) => ({
                          ...prev,
                          timezone: e.target.value,
                        }))
                      }
                    />
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={scheduleDraft.isEnabled}
                        onChange={(e) =>
                          setScheduleDraft((prev) => ({
                            ...prev,
                            isEnabled: e.target.checked,
                          }))
                        }
                      />
                      启用该调度
                    </label>
                    <Button
                      onClick={() => scheduleMutation.mutate()}
                      disabled={scheduleMutation.isPending}
                    >
                      {scheduleMutation.isPending && (
                        <Spinner className="mr-2 h-4 w-4" />
                      )}
                      {scheduleMutation.isPending ? "保存中..." : "保存调度"}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Label>手动触发（JSON Payload）</Label>
                    <Textarea
                      rows={6}
                      value={payload}
                      onChange={(e) => setPayload(e.target.value)}
                      placeholder='例如 {"maxItems": 5}'
                    />
                    <Button
                      variant="secondary"
                      onClick={handleTrigger}
                      disabled={triggerMutation.isPending && !isWorkflowBusy}
                    >
                      {(triggerMutation.isPending || isWorkflowBusy) && (
                        <Spinner className="mr-2 h-4 w-4" />
                      )}
                      {triggerMutation.isPending
                        ? "触发中..."
                        : isWorkflowBusy
                        ? "强制触发"
                        : "立即触发"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  请选择一个工作流查看详情。
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </AnimatedPage>
    </>
  );
}

function StatTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 p-4">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${className ?? ""}`}>{value}</p>
    </div>
  );
}
