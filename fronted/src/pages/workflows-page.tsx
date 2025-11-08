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
import { useSession } from "../lib/session";
import { useApiClient } from "../lib/use-api-client";
import { queryKeys } from "../lib/query-keys";
import { queryClient } from "../lib/query-client";
import type { WorkflowDefinition } from "../types";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  idle: "default",
  queued: "warning",
  running: "warning",
  success: "success",
  failed: "danger",
};

export function WorkflowsPage() {
  const { session } = useSession();
  const api = useApiClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.workflows(session),
    queryFn: () => api.fetchWorkflows(),
    enabled: session.unlocked,
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows(session),
      });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkflow) return;
      let data: Record<string, unknown> = {};
      if (payload.trim()) {
        try {
          data = JSON.parse(payload);
        } catch {
          throw new Error("Payload must be valid JSON");
        }
      }
      await api.triggerWorkflow(selectedWorkflow.id, data);
    },
  });

  return (
    <>
      <AppHeader title="工作流管理" subtitle="配置调度计划并手动触发" />
      <AnimatedPage>
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                工作流列表
              </p>
              <CardTitle className="text-xl">可用工作流</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[480px] scroll-area pr-2">
              {isLoading && (
                <p className="text-sm text-muted-foreground">加载中...</p>
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
                      {workflow.status.toUpperCase()}
                    </Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
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
                    <StatTile label="成功次数" value={selectedWorkflow.stats.successCount} />
                    <StatTile
                      label="失败次数"
                      value={selectedWorkflow.stats.failureCount}
                      className="text-rose-200"
                    />
                    <StatTile
                      label="平均耗时"
                      value={`${(selectedWorkflow.stats.averageDurationMs / 1000).toFixed(1)}s`}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>CRON 表达式</Label>
                    <Input
                      value={scheduleDraft.cron}
                      onChange={(e) =>
                        setScheduleDraft((prev) => ({ ...prev, cron: e.target.value }))
                      }
                    />
                    <Label>时区</Label>
                    <Input
                      value={scheduleDraft.timezone}
                      onChange={(e) =>
                        setScheduleDraft((prev) => ({ ...prev, timezone: e.target.value }))
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
                      启用调度
                    </label>
                    <Button
                      onClick={() => scheduleMutation.mutate()}
                      disabled={scheduleMutation.isPending}
                    >
                      {scheduleMutation.isPending ? "保存中..." : "保存调度"}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Label>手动触发（JSON Payload）</Label>
                    <Textarea
                      rows={6}
                      value={payload}
                      onChange={(e) => setPayload(e.target.value)}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => triggerMutation.mutate()}
                      disabled={triggerMutation.isPending}
                    >
                      {triggerMutation.isPending ? "触发中..." : "立即触发"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">请选择一个工作流。</p>
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
