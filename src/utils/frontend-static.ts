import { extname, join } from "node:path";

const DEFAULT_DIST_ROOT = join(import.meta.dir, "../../fronted/dist");

const MIME_TYPES = new Map<string, string>([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".ico", "image/x-icon"],
]);

export function resolveDistRoot() {
  const configured = process.env.FRONTEND_DIST;
  return configured ? join(process.cwd(), configured) : DEFAULT_DIST_ROOT;
}

export async function frontendBundleExists() {
  const distRoot = resolveDistRoot();
  const indexFile = Bun.file(join(distRoot, "index.html"));
  return await indexFile.exists();
}

export async function serveFrontendAsset(
  pathname: string,
): Promise<Response | null> {
  const distRoot = resolveDistRoot();
  const normalized = pathname.replace(/^\/+/, "");
  const safePath = normalized === "" ? "index.html" : normalized;

  if (safePath.includes("..")) {
    return null;
  }

  const resolvedFile = Bun.file(join(distRoot, safePath));

  if (await resolvedFile.exists()) {
    const ext = extname(safePath);
    const mime = MIME_TYPES.get(ext) ?? "application/octet-stream";
    const cacheHeader = ext === ".html"
      ? "no-cache"
      : "public, max-age=31536000, immutable";

    return new Response(resolvedFile, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": cacheHeader,
      },
    });
  }

  const fallbackFile = Bun.file(join(distRoot, "index.html"));
  if (await fallbackFile.exists()) {
    return new Response(fallbackFile, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  return null;
}

export async function proxyFrontendDev(req: Request, origin: string) {
  const sourceUrl = new URL(req.url);
  const target = new URL(sourceUrl.pathname + sourceUrl.search, origin);

  const init: RequestInit = {
    method: req.method,
    headers: req.headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(req.method.toUpperCase())) {
    init.body = req.body;
  }

  return fetch(target, init);
}

export function isFrontendRoute(pathname: string) {
  return pathname === "" ||
    (!pathname.startsWith("api/") && !pathname.startsWith("ws/"));
}
