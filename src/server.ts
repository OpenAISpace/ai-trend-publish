import { triggerWorkflow } from "./controllers/workflow.controller.ts";
import { WorkflowType } from "./controllers/cron.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";


export interface JSONRPCRequest {
  jsonrpc: string;
  method: string;
  params: Record<string, any>;
  id: string | number;
}

export interface JSONRPCResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

export class JSONRPCServer {
  private routes: Record<string, (params: Record<string, any>) => Promise<any>>;

  constructor() {
    this.routes = {};
  }


  registerRoute(method: string, handler: (params: Record<string, any>) => Promise<any>) {
    this.routes[method] = handler;
  }

  async handleRequest(request: Request): Promise<Response> {
    try {
      if (request.method !== "POST") {
        throw new Error("只支持 POST 请求");
      }

      const body = await request.json() as JSONRPCRequest;

      if (!body.jsonrpc || body.jsonrpc !== "2.0") {
        throw new Error("无效的 JSON-RPC 请求");
      }

      if (!body.method) {
        throw new Error("请求缺少方法名");
      }

      const handler = this.routes[body.method];
      if (!handler) {
        throw new Error(`方法 ${body.method} 不存在`);
      }

      const result = await handler(body.params || {});
      
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          result,
          id: body.id,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      const isClientError = error instanceof Error && (
        error.message.includes("无效的") ||
        error.message.includes("不存在") ||
        error.message.includes("缺少")
      );

      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: isClientError ? -32600 : -32603,
            message: isClientError ? error.message : "内部服务器错误",
            data: {
              error: error instanceof Error ? error.message : String(error),
            },
          },
          id: "unknown",
        }),
        {
          status: isClientError ? 400 : 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }
}

// 创建 JSON-RPC 服务器实例
const rpcServer = new JSONRPCServer();
rpcServer.registerRoute("triggerWorkflow", triggerWorkflow);

// 请求处理器
const handler = async (req: Request): Promise<Response> => {
  try {
    // 验证 Authorization 请求头
    const configManager = ConfigManager.getInstance();
    const API_KEY = await configManager.get("SERVER_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !==  API_KEY) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "未授权的访问",
            data: {
              error: "缺少有效的 Authorization 请求头"
            }
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          }
        }
      );
    }

    const url = new URL(req.url);
    
    // 规范化路径（移除开头和结尾的斜杠，处理可能的错误格式）
    const normalizedPath = url.pathname.replace(/^\/+|\/+$/g, "");
    
    // 只处理 api/workflow 路径的请求
    if (normalizedPath === "api/workflow") {
      return await rpcServer.handleRequest(req);
    }

    // 处理其他请求
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: "无效的API路径",
          data: {
            path: normalizedPath,
            expectedPath: "api/workflow"
          }
        },
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        }
      }
    );
  } catch (error) {
    console.error("请求处理错误:", error);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "服务器内部错误",
          data: {
            error: error instanceof Error ? error.message : String(error)
          }
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        }
      }
    );
  }
};

export default function startServer(port = 8000) {
  Deno.serve({ port }, handler);
  console.log(`JSON-RPC 服务器运行在 http://localhost:${port}`);
  console.log("支持的方法:");
  console.log("- triggerWorkflow");
  console.log(`可用的工作流类型: ${Object.values(WorkflowType).join(", ")}`);
}
