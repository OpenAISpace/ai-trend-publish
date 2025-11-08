import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatedPage } from "../components/animated-page";
import { AppHeader } from "../components/layout/app-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useSession } from "../lib/session";
import { useApiClient } from "../lib/use-api-client";
import { queryKeys } from "../lib/query-keys";
import { useWorkflowLogs } from "../hooks/use-workflow-logs";

const levelColor: Record<string, string> = {
  info: "border-white/10 text-foreground",
  debug: "border-white/5 text-muted-foreground",
  warn: "border-amber-400/40 text-amber-200",
  error: "border-rose-500/40 text-rose-200",
};

export function LogsPage() {
  const { session } = useSession();

  const { logs, connectionState, resetLogs } = useWorkflowLogs({
    url: "/ws/workflow-logs",
    token: session.apiKey,
  });

  return (
    <>
      <AppHeader title="实时日志" subtitle="追踪运行过程与告警" />
      <AnimatedPage>
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                WebSocket
              </p>
              <CardTitle className="text-xl">
                状态：{connectionState.toUpperCase()}
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={resetLogs}>
                清空
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[520px] space-y-3 scroll-area pr-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    levelColor[log.level] ?? "border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                    <span>
                      {log.workflowName ?? log.workflowId ?? "Workflow"}
                    </span>
                    <span>
                      {new Date(log.timestamp).toLocaleTimeString("en-GB", {
                        hour12: false,
                      })}
                    </span>
                  </div>
                  <p className="mt-2 text-base">{log.message}</p>
                </div>
              ))}
              {!logs.length && (
                <p className="text-sm text-muted-foreground">暂无日志</p>
              )}
            </div>
          </CardContent>
        </Card>
      </AnimatedPage>
    </>
  );
}
