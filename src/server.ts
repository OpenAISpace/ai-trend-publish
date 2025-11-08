import type { Server } from "bun";
import { Hono } from "hono";
import {
  listConfigsController,
  updateConfigController,
} from "@src/controllers/config.controller.ts";
import { getDashboardSnapshotController } from "@src/controllers/dashboard.controller.ts";
import {
  listPromptsController,
  updatePromptController,
} from "@src/controllers/prompt.controller.ts";
import {
  listDataSourcesController,
  createDataSourceController,
  updateDataSourceController,
  deleteDataSourceController,
} from "@src/controllers/data-source.controller.ts";
import {
  listWorkflowsController,
  listWorkflowResultsController,
  listWorkflowRunsController,
  triggerWorkflowController,
  updateWorkflowScheduleController,
} from "@src/controllers/workflows.controller.ts";
import { WorkflowType } from "@src/services/workflow-factory.ts";
import { WorkflowLogGateway } from "@src/services/workflow-log.gateway.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import {
  isFrontendRoute,
  proxyFrontendDev,
  serveFrontendAsset,
} from "@src/utils/frontend-static.ts";
import {
  jsonResponse,
  unauthorizedResponse,
} from "@src/utils/http-response.ts";

const logGateway = WorkflowLogGateway.getInstance();
const FRONTEND_DEV_SERVER = process.env.FRONTEND_DEV_SERVER;
const app = new Hono();

async function getServerApiKey(): Promise<string | null> {
  try {
    return await ConfigManager.getInstance().get("SERVER_API_KEY");
  } catch {
    return process.env.SERVER_API_KEY ?? null;
  }
}

app.use("/api/*", async (c, next) => {
  const apiKey = await getServerApiKey();
  if (apiKey) {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    if (token !== apiKey) {
      return unauthorizedResponse();
    }
  }
  return await next();
});

app.get("/api/config", async () => listConfigsController());

app.put("/api/config/:key", async (c) => {
  const key = decodeURIComponent(c.req.param("key"));
  let payload: Record<string, unknown> = {};
  try {
    payload = (await c.req.json()) as Record<string, unknown>;
  } catch {
    // ignore invalid JSON and fall back to empty payload
  }
  return updateConfigController(key, payload);
});

app.get("/api/prompts", async () => listPromptsController());

app.put("/api/prompts/:promptId", async (c) => {
  let payload: Record<string, unknown> = {};
  try {
    payload = (await c.req.json()) as Record<string, unknown>;
  } catch {
    // ignore invalid JSON
  }
  return updatePromptController(c.req.param("promptId"), {
    content: typeof payload.content === "string" ? payload.content : undefined,
  });
});

app.get("/api/data-sources", async () => listDataSourcesController());

app.post("/api/data-sources", async (c) => {
  let payload: Record<string, unknown> = {};
  try {
    payload = (await c.req.json()) as Record<string, unknown>;
  } catch {
    // ignore invalid JSON
  }
  return createDataSourceController({
    platform: typeof payload.platform === "string" ? payload.platform : undefined,
    identifier: typeof payload.identifier === "string"
      ? payload.identifier
      : undefined,
  });
});

app.put("/api/data-sources/:id", async (c) => {
  let payload: Record<string, unknown> = {};
  try {
    payload = (await c.req.json()) as Record<string, unknown>;
  } catch {
    // ignore invalid JSON
  }
  return updateDataSourceController(c.req.param("id"), {
    platform: typeof payload.platform === "string" ? payload.platform : undefined,
    identifier: typeof payload.identifier === "string"
      ? payload.identifier
      : undefined,
  });
});

app.delete("/api/data-sources/:id", async (c) =>
  deleteDataSourceController(c.req.param("id"))
);

app.get("/api/dashboard", async () => getDashboardSnapshotController());

app.get("/api/workflows", async () => listWorkflowsController());

app.get("/api/workflows/runs", async () => listWorkflowRunsController());

app.get("/api/workflows/results", async () =>
  listWorkflowResultsController()
);

app.put("/api/workflows/:workflowId/schedule", async (c) => {
  const workflowId = c.req.param("workflowId");
  let payload: Record<string, unknown> = {};
  try {
    payload = (await c.req.json()) as Record<string, unknown>;
  } catch {
    // ignore invalid JSON and fall back to empty payload
  }
  return updateWorkflowScheduleController(workflowId, payload);
});

app.post("/api/workflows/:workflowId/trigger", async (c) => {
  const workflowId = c.req.param("workflowId");
  let payload: Record<string, unknown> = {};
  let trigger: string | undefined;

  try {
    const body = (await c.req.json()) as Record<string, unknown>;
    if (body && typeof body === "object") {
      if (
        "payload" in body &&
        body.payload &&
        typeof body.payload === "object"
      ) {
        payload = body.payload as Record<string, unknown>;
      } else {
        const {
          trigger: _ignoredTrigger,
          clientRequestId: _ignoredRequestId,
          ...rest
        } = body;
        if (Object.keys(rest).length > 0) {
          payload = rest as Record<string, unknown>;
        }
      }
      if (typeof body.trigger === "string") {
        trigger = body.trigger;
      }
    }
  } catch {
    // ignore invalid JSON, keep defaults
  }

  if (!payload) {
    payload = {};
  }

  return triggerWorkflowController(workflowId, payload, trigger);
});

app.onError((err) => {
  console.error("请求处理错误:", err);
  return jsonResponse(
    {
      error: {
        code: -32603,
        message: "服务器内部错误",
        data: {
          error: err instanceof Error ? err.message : String(err),
        },
      },
    },
    500,
  );
});

app.notFound(async (c) => {
  const normalizedPath = c.req.path.replace(/^\/+|\/+$/g, "");

  if (normalizedPath.startsWith("api/")) {
    return jsonResponse(
      {
        error: {
          code: -32601,
          message: "无效的API路径",
          data: { path: normalizedPath },
        },
      },
      404,
    );
  }

  if (isFrontendRoute(normalizedPath)) {
    if (process.env.NODE_ENV !== "production" && FRONTEND_DEV_SERVER) {
      return proxyFrontendDev(c.req.raw, FRONTEND_DEV_SERVER);
    }

    const asset = await serveFrontendAsset(normalizedPath);
    if (asset) {
      return asset;
    }

    return new Response("Asset not found", { status: 404 });
  }

  return new Response("Not found", { status: 404 });
});

async function handleWebSocket(
  req: Request,
  server: Server | undefined,
  apiKey: string | null,
) {
  if (!server) {
    return new Response("Server unavailable", { status: 503 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const workflowId = url.searchParams.get("workflowId") ?? undefined;

  if (apiKey && token !== apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const upgraded = server.upgrade(req, {
    data: { workflowId },
  });

  if (upgraded) {
    return;
  }
  return new Response("Upgrade failed", { status: 500 });
}

const honoFetch = app.fetch;

export default function startServer(port = 8000) {
  const server = Bun.serve({
    port,
    fetch: async (req, srv) => {
      const url = new URL(req.url);
      if (url.pathname === "/ws/workflow-logs") {
        const apiKey = await getServerApiKey();
        return await handleWebSocket(req, srv, apiKey);
      }
      return honoFetch(req);
    },
    websocket: {
      open(ws) {
        logGateway.addSocket(ws as any);
      },
      close(ws) {
        logGateway.removeSocket(ws as any);
      },
      message() {
        // no-op
      },
    },
  });
  console.log(`REST API 服务器运行在 http://localhost:${server.port}`);
  console.log("工作流触发端点");
  console.log("- POST /api/workflows/:workflowId/trigger");
  console.log(`可用的工作流类型: ${Object.values(WorkflowType).join(", ")}`);
}
