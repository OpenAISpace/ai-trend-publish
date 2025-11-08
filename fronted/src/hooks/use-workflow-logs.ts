import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkflowLogMessage } from "../types";

const LEVELS: WorkflowLogMessage["level"][] = ["debug", "info", "warn", "error"];

const randomId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const mockMessages: Record<WorkflowLogMessage["level"], string[]> = {
  debug: [
    "Entering step prepare-payload",
    "Cache hit, reusing previous snapshot",
    "Persisted 32 vectors to storage",
  ],
  info: [
    "Workflow execution started",
    "Completed step summarize",
    "Publish step succeeded",
    "Waiting for the next schedule window",
  ],
  warn: [
    "LLM call took 25s which is above the SLA",
    "API throttled, preparing exponential backoff",
  ],
  error: [
    "Publish failed: 401 Unauthorized",
    "Data fetch failed: connection reset",
  ],
};

function createMockLog(workflowId?: string): WorkflowLogMessage {
  const workflowNames: Record<string, string> = {
    "weixin-article-workflow": "Weixin Article",
    "weixin-aibench-workflow": "Weixin AI Bench",
    "weixin-hellogithub-workflow": "Hello GitHub Picks",
  };

  const id = randomId();
  const level = LEVELS[Math.floor(Math.random() * LEVELS.length)];
  const wfId =
    workflowId ??
    (Object.keys(workflowNames) as (keyof typeof workflowNames)[])[
      Math.floor(Math.random() * 3)
    ];

  const pool = mockMessages[level] || mockMessages.info;

  return {
    id,
    workflowId: wfId,
    workflowName: workflowNames[wfId],
    level,
    message: pool[Math.floor(Math.random() * pool.length)] ?? "Workflow log",
    timestamp: new Date().toISOString(),
  };
}

interface Options {
  workflowId?: string;
  url?: string | null;
  token?: string;
}

export function useWorkflowLogs(options: Options = {}) {
  const { workflowId, url, token } = options;
  const [logs, setLogs] = useState<WorkflowLogMessage[]>([]);
  const [connectionState, setConnectionState] = useState<
    "mock" | "connecting" | "open" | "closed" | "error"
  >("mock");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setLogs([]);
  }, [workflowId]);

  useEffect(() => {
    if (!url) {
      setConnectionState("mock");
      const timer = setInterval(() => {
        setLogs((prev) => [createMockLog(workflowId), ...prev].slice(0, 300));
      }, 2000);
      return () => clearInterval(timer);
    }

    const urlObj =
      typeof window !== "undefined" && !url.startsWith("http")
        ? new URL(url, window.location.origin)
        : new URL(url);
    if (token) {
      urlObj.searchParams.set("token", token);
    }
    if (workflowId) {
      urlObj.searchParams.set("workflowId", workflowId);
    }

    setConnectionState("connecting");
    const ws = new WebSocket(urlObj.toString());
    wsRef.current = ws;

    ws.onopen = () => setConnectionState("open");
    ws.onerror = () => setConnectionState("error");
    ws.onclose = () => setConnectionState("closed");
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as WorkflowLogMessage;
        setLogs((prev) => [parsed, ...prev].slice(0, 500));
      } catch {
        // ignore invalid payloads
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [url, token, workflowId]);

  const resetLogs = () => setLogs([]);
  const pushMockLog = () =>
    setLogs((prev) => [createMockLog(workflowId), ...prev].slice(0, 300));

  return useMemo(
    () => ({
      logs,
      connectionState,
      resetLogs,
      pushMockLog,
    }),
    [logs, connectionState],
  );
}
