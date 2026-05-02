import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, BackendDownError, makeApi, type Me } from "./api";

/** Returns the request cookie as a single string suitable for forwarding. */
export async function requestCookie(): Promise<string> {
  return (await cookies()).toString();
}

/**
 * Resolve the session user via /api/me. Redirects:
 *  - no cookie / 401  → /login
 *  - first login      → /set-password (skipped when `skipSetPassword`)
 *
 * `skipSetPassword` is for the /set-password page itself, otherwise it would
 * loop on its own redirect.
 */
export async function requireUser(opts?: {
  skipSetPassword?: boolean;
}): Promise<{ me: Me; cookie: string }> {
  const cookie = await requestCookie();
  if (!cookie) redirect("/login");

  const api = makeApi(cookie);
  let me: Me;
  try {
    me = await api.me();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
    throw e;
  }

  if (!opts?.skipSetPassword && me.must_set_password) {
    redirect("/set-password");
  }

  return { me, cookie };
}

/**
 * Both INPLICIT_ADMIN and INPLICIT_STAFF can access /staff/* routes.
 * Customer ORG_OWNERs are bounced back to their own dashboard.
 */
export async function requireStaff(): Promise<{ me: Me; cookie: string }> {
  const { me, cookie } = await requireUser();
  if (me.role !== "INPLICIT_ADMIN" && me.role !== "INPLICIT_STAFF") {
    redirect("/campaigns");
  }
  return { me, cookie };
}

/** Admin-only routes (e.g. /staff/users). Other staff get bounced. */
export async function requireAdmin(): Promise<{ me: Me; cookie: string }> {
  const { me, cookie } = await requireUser();
  if (me.role !== "INPLICIT_ADMIN") redirect("/staff/orgs");
  return { me, cookie };
}

/**
 * Customer-area guard. Staff users get rerouted to /staff/orgs because
 * /api/campaigns rejects them without an explicit ?org_id= parameter.
 */
export async function requireOrgOwner(): Promise<{ me: Me; cookie: string }> {
  const { me, cookie } = await requireUser();
  if (me.role !== "ORG_OWNER") redirect("/staff/orgs");
  return { me, cookie };
}

export { BackendDownError };
