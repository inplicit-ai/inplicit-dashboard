import { Handlers } from "$fresh/server.ts";

/** /staff → /staff/orgs */
export const handler: Handlers = {
  GET() {
    return new Response(null, {
      status: 302,
      headers: { Location: "/staff/orgs" },
    });
  },
};
