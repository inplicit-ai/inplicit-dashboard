import { NextResponse, type NextRequest } from "next/server";

const API_BASE = process.env.API_URL ?? "http://localhost:8080";

// Some proxied endpoints make their own outbound calls (e.g. the Granola OAuth
// `connect` registers a client) and can take a few seconds. Give the function
// room so a slow backend yields a real status, not an HTML 504 the client then
// fails to JSON-parse.
export const maxDuration = 30;

/**
 * Pass-through proxy: browser → Next.js (same origin) → backend.
 * Forwards method, body, and the session cookie. Lets client components talk
 * to the Rust API without CORS gymnastics.
 *
 * Mounted at /dapi/* — e.g. POST /dapi/participants/<id>/invite
 * → POST {API_BASE}/api/participants/<id>/invite
 */
async function forward(req: NextRequest, segments: string[]): Promise<Response> {
  const url = req.nextUrl;
  const path = segments.join("/");
  const target = `${API_BASE}/api/${path}${url.search}`;

  const headers = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
    // Backend API calls return JSON, never redirects to follow. `manual` keeps
    // an accidental 3xx from being chased into an HTML body the client can't parse.
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(target, init);
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: res.status,
      headers: {
        "content-type":
          res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    console.error(`[dapi] ${req.method} ${target} → ${(e as Error).message}`);
    return NextResponse.json(
      { error: `Backend nicht erreichbar (${API_BASE})` },
      { status: 502 },
    );
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
