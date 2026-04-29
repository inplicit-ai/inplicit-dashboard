import { defineRoute } from "$fresh/server.ts";

export default defineRoute(() => Response.json({ status: "ok" }));
