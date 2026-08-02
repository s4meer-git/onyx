import { getSessionUser } from "./auth";

/**
 * The read-only /api/v1/* endpoints accept either an app session cookie or a
 * bearer token, so widgets, shortcuts and dashboards can pull the data.
 */
export async function authoriseApi(request: Request): Promise<boolean> {
  if (await getSessionUser()) return true;

  const token = process.env.API_TOKEN;
  if (!token) return false;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  const query = new URL(request.url).searchParams.get("token");
  const provided = bearer ?? request.headers.get("x-api-key") ?? query;

  return Boolean(provided) && provided === token;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
