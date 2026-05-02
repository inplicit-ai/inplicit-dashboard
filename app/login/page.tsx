import { redirect } from "next/navigation";
import { ApiError, makeApi } from "@/lib/api";
import { LoginCard } from "@/components/LoginCard";
import "./login.css";

const API_BASE = process.env.API_URL ?? "http://localhost:8080";

interface LoginSearchParams {
  email?: string;
  error?: string;
  message?: string;
  devLink?: string;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const sp = await searchParams;

  async function signIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email) {
      redirect("/login?error=" + encodeURIComponent("Email is required."));
    }

    if (password) {
      const res = await fetch(`${API_BASE}/api/auth/sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });
      type SignInResponse = {
        role?: string;
        org_id?: string | null;
        must_set_password?: boolean;
      };
      let apiErrorMsg = "";
      let signIn: SignInResponse | null = null;
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const detail = await res.json();
          if (detail && typeof detail === "object" && "error" in detail) {
            msg = String((detail as { error: string }).error);
          }
        } catch {}
        apiErrorMsg = msg;
      } else {
        try {
          signIn = (await res.json()) as SignInResponse;
        } catch {
          // Body parse failed but the cookie is set — fall through.
        }
      }
      if (apiErrorMsg) {
        redirect(`/login?error=${encodeURIComponent(apiErrorMsg)}&email=${encodeURIComponent(email)}`);
      }
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        // Mirror the backend's Set-Cookie attributes verbatim so __Host-
        // prefix invariants (Secure / Path=/ / no Domain) survive.
        const { cookies } = await import("next/headers");
        const jar = await cookies();
        const parsed = parseSetCookie(setCookie);
        if (parsed) {
          jar.set(parsed.name, parsed.value, parsed.options);
        }
      }

      // Resolve the redirect target from the sign-in response itself rather
      // than following up with /api/me — the second round-trip used to add
      // 300–600ms (or up to a few seconds on a cold backend) to "Continue".
      let location = "/campaigns";
      if (signIn?.must_set_password) {
        location = "/set-password";
      } else if (
        signIn?.role === "INPLICIT_STAFF" ||
        signIn?.role === "INPLICIT_ADMIN"
      ) {
        location = "/staff/orgs";
      }
      redirect(location);
    }

    let params: URLSearchParams | null = null;
    let magicLinkError: string | null = null;

    try {
      const result = await makeApi().auth.sendMagicLink(email);
      params = new URLSearchParams({ message: `Magic link sent to ${email}.`, email });
      if (result.dev_link) params.set("devLink", result.dev_link);
    } catch (e) {
      magicLinkError = e instanceof ApiError ? e.message : (e as Error).message;
    }

    if (params) {
      redirect("/login?" + params.toString());
    } else if (magicLinkError) {
      redirect(`/login?error=${encodeURIComponent(magicLinkError)}&email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <LoginCard
      signIn={signIn}
      defaultEmail={sp.email}
      error={sp.error}
      message={sp.message}
      devLink={sp.devLink}
    />
  );
}

interface ParsedCookie {
  name: string;
  value: string;
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
    domain?: string;
    maxAge?: number;
    expires?: Date;
  };
}

function parseSetCookie(header: string): ParsedCookie | null {
  // Multiple cookies in one Set-Cookie header are split by `, ` only when the
  // following segment looks like another cookie pair (avoids breaking on
  // `Expires=Mon, 01 Jan 2025…`). Backend currently issues one at a time.
  const first = header.split(/,(?=\s*[A-Za-z0-9_-]+=)/)[0] ?? header;
  const parts = first.split(";").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const [pair, ...attrs] = parts;
  const eq = pair.indexOf("=");
  if (eq < 0) return null;

  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();
  const options: ParsedCookie["options"] = {};

  for (const attr of attrs) {
    const idx = attr.indexOf("=");
    const key = (idx < 0 ? attr : attr.slice(0, idx)).trim().toLowerCase();
    const val = idx < 0 ? "" : attr.slice(idx + 1).trim();

    if (key === "httponly") options.httpOnly = true;
    else if (key === "secure") options.secure = true;
    else if (key === "samesite") {
      const v = val.toLowerCase();
      if (v === "lax" || v === "strict" || v === "none") options.sameSite = v;
    } else if (key === "path") options.path = val || "/";
    else if (key === "domain") options.domain = val;
    else if (key === "max-age") {
      const n = Number(val);
      if (!Number.isNaN(n)) options.maxAge = n;
    } else if (key === "expires") {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) options.expires = d;
    }
  }

  return { name, value, options };
}
