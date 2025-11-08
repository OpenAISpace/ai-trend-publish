import crypto from "node:crypto";
import type { ServerWebSocket } from "bun";
import { WORKFLOW_PRESET_MAP } from "@src/constants/workflows.ts";
import { WorkflowType } from "@src/types/workflows.ts";

export type WorkflowLogLevel = "debug" | "info" | "warn" | "error";

export interface WorkflowLogMessage {
  id: string;
  workflowId?: WorkflowType;
  workflowName?: string;
  level: WorkflowLogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

interface SocketData {
  workflowId?: string;
}

export class WorkflowLogGateway {
  private static instance: WorkflowLogGateway;
  private sockets: Set<ServerWebSocket<SocketData>> = new Set();

  private constructor() {}

  static getInstance(): WorkflowLogGateway {
    if (!WorkflowLogGateway.instance) {
      WorkflowLogGateway.instance = new WorkflowLogGateway();
    }
    return WorkflowLogGateway.instance;
  }

  addSocket(ws: ServerWebSocket<SocketData>) {
    this.sockets.add(ws);
  }

  removeSocket(ws: ServerWebSocket<SocketData>) {
    this.sockets.delete(ws);
  }

  publish(message: WorkflowLogMessage) {
    const payload = JSON.stringify(message);
    for (const socket of this.sockets) {
      if (
        socket.data.workflowId &&
        message.workflowId &&
        socket.data.workflowId !== message.workflowId
      ) {
        continue;
      }
      try {
        socket.send(payload);
      } catch {
        this.sockets.delete(socket);
      }
    }
  }

  emitLogRecord(record: {
    level: string;
    category: string | string[];
    message: string;
    timestamp: number;
  }) {
    const categoryString = Array.isArray(record.category)
      ? record.category.join(".")
      : String(record.category ?? "");

    if (!categoryString.toLowerCase().includes("workflow")) {
      return;
    }

    const level = (record.level?.toLowerCase() ??
      "info") as WorkflowLogLevel;
    const workflowEntry = Array.from(WORKFLOW_PRESET_MAP.entries()).find(
      ([workflowId]) => categoryString.includes(workflowId),
    );

    const workflowId = workflowEntry?.[0];
    const workflowName = workflowEntry?.[1].name ?? categoryString;

    this.publish({
      id: crypto.randomUUID(),
      workflowId,
      workflowName,
      level,
      message: record.message,
      timestamp: new Date(record.timestamp).toISOString(),
    });
  }
}
