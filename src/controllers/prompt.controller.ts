import { PromptService } from "@src/services/prompt.service.ts";
import {
  errorResponse,
  jsonResponse,
} from "@src/utils/http-response.ts";

const promptService = PromptService.getInstance();

export async function listPromptsController() {
  const prompts = await promptService.listPrompts();
  return jsonResponse(prompts);
}

export async function updatePromptController(
  id: string | undefined,
  payload: { content?: string },
) {
  if (!id) {
    return errorResponse({ code: -32602, message: "Missing prompt id" }, 400);
  }
  if (typeof payload.content !== "string") {
    return errorResponse(
      { code: -32602, message: "Missing prompt content" },
      400,
    );
  }
  try {
    const prompt = await promptService.updatePrompt(id, payload.content);
    return jsonResponse(prompt);
  } catch (error) {
    return errorResponse(
      {
        code: -32603,
        message: error instanceof Error ? error.message : "Unable to update prompt",
      },
      500,
    );
  }
}
