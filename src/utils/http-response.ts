type ErrorPayload = {
  code: number;
  message: string;
  data?: Record<string, unknown>;
};

const defaultHeaders = {
  "Content-Type": "application/json",
};

export function jsonResponse(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...defaultHeaders,
      ...(headers ?? {}),
    },
  });
}

export function errorResponse(
  payload: ErrorPayload,
  status = 400,
  headers?: HeadersInit,
) {
  return jsonResponse({ error: payload }, status, headers);
}

export function unauthorizedResponse() {
  return errorResponse(
    { code: -32001, message: "未授权的访问" },
    401,
  );
}
