import { Handlers } from "$fresh/server.ts";

const API_BASE = Deno.env.get("API_URL") ?? "http://localhost:8080";

/**
 * Pass-through proxy: browser → Fresh (same origin) → backend.
 * Forwards method, body, and the session cookie. Lets islands talk to the
 * Rust API without CORS gymnastics.
 *
 * Mounted at /dapi/* — e.g. POST /dapi/participants/<id>/invite
 * → POST {API_BASE}/api/participants/<id>/invite
 */
export const handler: Handlers = {
  async GET(req, ctx) {
    return forward(req, ctx.params.path);
  },
  async POST(req, ctx) {
    return forward(req, ctx.params.path);
  },
  async PATCH(req, ctx) {
    return forward(req, ctx.params.path);
  },
  async PUT(req, ctx) {
    return forward(req, ctx.params.path);
  },
  async DELETE(req, ctx) {
    return forward(req, ctx.params.path);
  },
};

async function forward(req: Request, path: string): Promise<Response> {
  const url = new URL(req.url);
  const target = `${API_BASE}/api/${path}${url.search}`;

  const headers = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const init: RequestInit = {
    method: req.method,
    headers,
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(target, init);
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (e) {
    console.error(`[dapi] ${req.method} ${target} → ${(e as Error).message}`);
    return new Response(
      JSON.stringify({ error: `Backend nicht erreichbar (${API_BASE})` }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}
