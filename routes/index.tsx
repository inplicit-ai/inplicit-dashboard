import { defineRoute } from "$fresh/server.ts";

export default defineRoute((_req, _ctx) => {
  return new Response(null, {
    status: 302,
    headers: { Location: "/admin/campaigns" },
  });
});
