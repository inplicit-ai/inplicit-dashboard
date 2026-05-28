import { type NextRequest } from "next/server";

const API_BASE = process.env.API_URL ?? "http://localhost:8080";

/**
 * Streaming SSE passthrough for the setup-agent turn endpoint.
 *
 * The generic /dapi/[...path] proxy buffers the whole response (arrayBuffer),
 * which would defeat token-by-token streaming. This route forwards the POST and
 * pipes the backend's SSE body straight through, unbuffered, so the browser
 * receives `token` / `tool_call` / `error` / `done` events live.
 *
 * Mounted at POST /dapi/setup-stream/:id
 *   → POST {API_BASE}/api/orgs/me/setup-sessions/:id/messages
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const target = `${API_BASE}/api/orgs/me/setup-sessions/${id}/messages${req.nextUrl.search}`;

  const headers = new Headers();
  headers.set("content-type", "application/json");
  headers.set("accept", "text/event-stream");
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  let res: Response;
  try {
    res = await fetch(target, {
      method: "POST",
      headers,
      body: await req.text(),
      cache: "no-store",
      // @ts-expect-error — duplex is required by undici for streamed bodies
      duplex: "half",
    });
  } catch (e) {
    console.error(`[setup-stream] ${target} → ${(e as Error).message}`);
    return new Response(
      `event: error\ndata: {"code":"backend_unreachable"}\n\nevent: done\ndata: {}\n\n`,
      { status: 200, headers: { "content-type": "text/event-stream" } },
    );
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    console.error(`[setup-stream] backend ${res.status}: ${text}`);
    return new Response(
      `event: error\ndata: {"code":"agent_error","status":${res.status}}\n\nevent: done\ndata: {}\n\n`,
      { status: 200, headers: { "content-type": "text/event-stream" } },
    );
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
