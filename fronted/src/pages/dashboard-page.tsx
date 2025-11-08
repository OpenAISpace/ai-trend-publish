import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatedPage } from "../components/animated-page";
import { AppHeader } from "../components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Spinner } from "../components/ui/spinner";
import { useSession } from "../lib/session";
import { queryKeys } from "../lib/query-keys";
import { useApiClient } from "../lib/use-api-client";
import type {
  DashboardSnapshot,
  WorkflowDefinition,
  WorkflowResult,
  WorkflowRun,
  WorkflowStatus,
} from "../types";

const formatDateTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString("zh-CN", {
        hour12: false,
      })
    : "—";

const statusVariant: Record<WorkflowStatus, "default" | "success" | "warning" | "danger"> =
  {
    idle: "default",
    queued: "warning",
    running: "warning",
    success: "success",
    failed: "danger",
  };

const statusLabel: Record<WorkflowStatus, string> = {
  idle: "空闲",
  queued: "排队",
  running: "执行中",
  success: "成功",
  failed: "失败",
};

export function DashboardPage() {
  const { session } = useSession();
  const api = useApiClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.dashboard(session),
    queryFn: () => api.fetchDashboard(),
    enabled: session.unlocked,
    refetchInterval: 15_000,
  });

  const snapshot: DashboardSnapshot | undefined = data;
  const workflows = snapshot?.workflows ?? [];
  const runs = snapshot?.runs ?? [];
  const results = snapshot?.results ?? [];

  const stats = useMemo(() => {
    if (!snapshot) {
      return {
        totalWorkflows: 0,
        successRate: "0.0%",
        avgDuration: "—",
        configCount: 0,
      };
    }
    const totalRuns = runs.length;
    const successRuns = runs.filter((run) => run.status === "success").length;
    const avgMs =
      runs.reduce((sum, run) => {
        if (!run.startedAt || !run.finishedAt) return sum;
        return (
          sum +
          (new Date(run.finishedAt).getTime() -
            new Date(run.startedAt).getTime())
        );
      }, 0) / (totalRuns || 1);
    return {
      totalWorkflows: snapshot.workflows.length,
      successRate: `${((successRuns / (totalRuns || 1)) * 100).toFixed(1)}%`,
      avgDuration: avgMs > 0 ? `${(avgMs / 1000).toFixed(1)}s` : "—",
      configCount: snapshot.configs.length,
    };
  }, [snapshot, runs]);

  const recentSuccess = runs
    .filter((run) => run.status === "success")
    .slice(0, 5);
  const recentFailures = runs
    .filter((run) => run.status === "failed")
    .slice(0, 5);

  return (
    <>
      <AppHeader
        title="趋势总览"
        subtitle="掌握调度运行、任务质量与内容产出的实时态势"
      />
      <AnimatedPage>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="工作流数量" value={stats.totalWorkflows} />
          <StatCard label="成功率" value={stats.successRate} />
          <StatCard label="平均耗时" value={stats.avgDuration} />
          <StatCard label="配置项" value={stats.configCount} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                  工作流状态
                </p>
                <CardTitle className="text-xl">调度与运行健康度</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                手动刷新
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[420px] scroll-area pr-2">
              {isLoading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  加载中...
                </p>
              )}
              {isError && (
                <p className="text-sm text-rose-400">
                  同步失败，请确认 Server API Key 是否正确。
                </p>
              )}
              {!isLoading &&
                workflows.map((workflow: WorkflowDefinition) => (
                  <div
                    key={workflow.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-base font-medium">
                        {workflow.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        下次执行：{formatDateTime(workflow.schedule.nextRunAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 text-xs text-muted-foreground md:flex-row md:items-center md:gap-4">
                      <Badge
                        variant={statusVariant[workflow.status] ?? "default"}
                      >
                        {statusLabel[workflow.status]}
                      </Badge>
                      <Separator
                        orientation="vertical"
                        className="hidden h-6 md:block"
                      />
                      <div className="text-right text-xs text-muted-foreground">
                        <p>
                          最近执行：{formatDateTime(workflow.schedule.lastRunAt)}
                        </p>
                        <p>
                          成功 {workflow.stats.successCount} · 失败{" "}
                          {workflow.stats.failureCount}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              {!isLoading && workflows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  暂无工作流记录。
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                最新产出
              </p>
              <CardTitle className="text-xl">内容预览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[420px] scroll-area pr-2">
              {results.map((result: WorkflowResult) => (
                <div key={result.id} className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {result.workflowName}
                    </p>
                    <Badge variant="outline">{statusLabel[result.status]}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {result.preview ?? "暂无摘要"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    生成时间：{formatDateTime(result.generatedAt)}
                  </p>
                </div>
              ))}
              {!results.length && (
                <p className="text-sm text-muted-foreground">暂无产出。</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RunList
            title="最近成功"
            caption="最近 5 次成功运行的任务"
            runs={recentSuccess}
            emptyText="暂无成功记录"
          />
          <RunList
            title="最近失败"
            caption="需要关注的失败任务"
            runs={recentFailures}
            emptyText="暂无失败记录"
          />
        </div>
      </AnimatedPage>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          {label}
        </p>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function RunList({
  title,
  caption,
  runs,
  emptyText,
}: {
  title: string;
  caption: string;
  runs: WorkflowRun[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          {caption}
        </p>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[360px] scroll-area pr-2">
        {runs.map((run) => (
          <div
            key={run.id}
            className="rounded-2xl border border-white/5 bg-white/5 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{run.workflowName}</p>
              <Badge variant={statusVariant[run.status] ?? "default"}>
                {statusLabel[run.status]}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              触发方式：{run.trigger.toUpperCase()} · 开始于{" "}
              {formatDateTime(run.startedAt)}
            </p>
            {run.resultSummary && (
              <p className="mt-1 text-xs text-muted-foreground/80">
                {run.resultSummary}
              </p>
            )}
          </div>
        ))}
        {!runs.length && (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}
