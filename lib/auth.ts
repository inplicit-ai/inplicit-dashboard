import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, BackendDownError, makeApi, type Me } from "./api";

/** Returns the request cookie as a single string suitable for forwarding. */
export async function requestCookie(): Promise<string> {
  return (await cookies()).toString();
}

/**
 * Resolves the current user via /api/me. Redirects to /admin/login when
 * unauthenticated. Throws BackendDownError to be handled by an error boundary
 * if the backend is unreachable.
 */
export async function requireUser(): Promise<{ me: Me; cookie: string }> {
  const cookie = await requestCookie();
  if (!cookie) redirect("/admin/login");

  const api = makeApi(cookie);
  try {
    const me = await api.me();
    return { me, cookie };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/admin/login");
    throw e;
  }
}

/** Like {@link requireUser}, but redirects non-staff users to /admin/campaigns.
 *  Both INPLICIT_ADMIN and INPLICIT_STAFF can access /staff/* routes. */
export async function requireStaff(): Promise<{ me: Me; cookie: string }> {
  const { me, cookie } = await requireUser();
  if (me.role !== "INPLICIT_ADMIN" && me.role !== "INPLICIT_STAFF") {
    redirect("/admin/campaigns");
  }
  return { me, cookie };
}

/** Admin-only routes (e.g. /staff/users). Other staff get bounced. */
export async function requireAdmin(): Promise<{ me: Me; cookie: string }> {
  const { me, cookie } = await requireUser();
  if (me.role !== "INPLICIT_ADMIN") redirect("/staff/orgs");
  return { me, cookie };
}

export { BackendDownError };
