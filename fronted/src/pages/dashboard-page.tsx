import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatedPage } from "../components/animated-page";
import { AppHeader } from "../components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { useSession } from "../lib/session";
import { queryKeys } from "../lib/query-keys";
import { useApiClient } from "../lib/use-api-client";
import type {
  DashboardSnapshot,
  WorkflowDefinition,
  WorkflowResult,
} from "../types";

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", { hour12: false });
};

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  idle: "default",
  queued: "warning",
  running: "warning",
  success: "success",
  failed: "danger",
};

export function DashboardPage() {
  const { session } = useSession();
  const api = useApiClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.dashboard(session),
    queryFn: () => api.fetchDashboard(),
    enabled: session.unlocked,
  });

  const snapshot: DashboardSnapshot | undefined = data;
  const workflows = snapshot?.workflows ?? [];

  const stats = useMemo(() => {
    if (!snapshot) {
      return {
        totalWorkflows: 0,
        successRate: "0.0",
        avgDuration: "0s",
        totalConfigs: 0,
      };
    }
    const runs = snapshot.runs;
    const total = runs.length || 1;
    const success = runs.filter((run) => run.status === "success").length;
    const avgDuration =
      runs.reduce((sum, run) => {
        if (!run.finishedAt) return sum;
        return sum + (new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime());
      }, 0) / total;
    return {
      totalWorkflows: snapshot.workflows.length,
      successRate: ((success / total) * 100).toFixed(1),
      avgDuration: avgDuration > 0 ? `${(avgDuration / 1000).toFixed(1)}s` : "-",
      totalConfigs: snapshot.configs.length,
    };
  }, [snapshot]);

  return (
    <>
      <AppHeader title="趋势总览" subtitle="实时洞察调度、运行与产出" />
      <AnimatedPage>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="工作流数量" value={stats.totalWorkflows} />
          <StatCard label="成功率" value={`${stats.successRate}%`} />
          <StatCard label="平均耗时" value={stats.avgDuration} />
          <StatCard label="配置项" value={stats.totalConfigs} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                  调度状态
                </p>
                <CardTitle className="text-xl">工作流运行概况</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                手动同步
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading && (
                  <p className="text-sm text-muted-foreground">加载中...</p>
                )}
              {isError && (
                <p className="text-sm text-rose-300">
                  Failed to sync. Verify the server API key.
                </p>
              )}
              {!isLoading &&
                workflows.map((workflow: WorkflowDefinition) => (
                  <div
                    key={workflow.id}
                    className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-base font-medium">{workflow.name}</p>
                      <p className="text-xs text-muted-foreground">
                        下次执行 {formatDate(workflow.schedule.nextRunAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusVariant[workflow.status] ?? "default"}>
                        {workflow.status.toUpperCase()}
                      </Badge>
                      <Separator orientation="vertical" className="hidden h-6 md:block" />
                      <div className="text-right text-xs text-muted-foreground">
                        <p>最近一次 {formatDate(workflow.schedule.lastRunAt)}</p>
                        <p>
                          成功 {workflow.stats.successCount} / 失败 {workflow.stats.failureCount}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                最新产出
              </p>
              <CardTitle className="text-xl">内容结果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {snapshot?.results?.map((result: WorkflowResult) => (
                <div key={result.id} className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{result.workflowName}</p>
                    <Badge variant="outline">{result.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{result.preview}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {formatDate(result.generatedAt)}
                  </p>
                </div>
              ))}
              {!snapshot?.results?.length && (
                <p className="text-sm text-muted-foreground">暂无产出</p>
              )}
            </CardContent>
          </Card>
        </div>
      </AnimatedPage>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          {label}
        </p>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
