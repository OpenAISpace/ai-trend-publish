import { DataSourceService } from "@src/services/data-source.service.ts";
import {
  errorResponse,
  jsonResponse,
} from "@src/utils/http-response.ts";

const dataSourceService = DataSourceService.getInstance();
const SUPPORTED_PLATFORMS = new Set(["firecrawl", "twitter"]);

function normalizePlatform(value?: string) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (!SUPPORTED_PLATFORMS.has(normalized)) {
    return null;
  }
  return normalized;
}

export async function listDataSourcesController() {
  const records = await dataSourceService.list();
  return jsonResponse(records);
}

export async function createDataSourceController(
  payload: { platform?: string; identifier?: string },
) {
  const platform = normalizePlatform(payload.platform);
  if (!platform || !payload.identifier) {
    return errorResponse(
      { code: -32602, message: "platform must be firecrawl or twitter, identifier required" },
      400,
    );
  }
  const created = await dataSourceService.create({
    platform,
    identifier: payload.identifier,
  });
  return jsonResponse(created);
}

export async function updateDataSourceController(
  idParam: string | undefined,
  payload: { platform?: string; identifier?: string },
) {
  const id = Number(idParam);
  if (!id || Number.isNaN(id)) {
    return errorResponse({ code: -32602, message: "Invalid id" }, 400);
  }
  const patch: { platform?: string; identifier?: string } = {};
  if (payload.platform) {
    const normalized = normalizePlatform(payload.platform);
    if (!normalized) {
      return errorResponse({ code: -32602, message: "Invalid platform" }, 400);
    }
    patch.platform = normalized;
  }
  if (typeof payload.identifier === "string") {
    patch.identifier = payload.identifier;
  }
  await dataSourceService.update(id, patch);
  return jsonResponse({ ok: true });
}

export async function deleteDataSourceController(idParam: string | undefined) {
  const id = Number(idParam);
  if (!id || Number.isNaN(id)) {
    return errorResponse({ code: -32602, message: "Invalid id" }, 400);
  }
  await dataSourceService.remove(id);
  return jsonResponse({ ok: true });
}
