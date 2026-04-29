const API_BASE = Deno.env.get("API_URL") ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

export class BackendDownError extends Error {
  constructor() {
    super(`Backend not reachable at ${API_BASE}. Is "cargo run" running in inplicit-backend/?`);
  }
}

export function makeApi(cookie?: string) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (cookie) headers["Cookie"] = cookie;

    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    } catch (e) {
      console.error(`[api] ${init?.method ?? "GET"} ${path} → network error:`, (e as Error).message);
      throw new BackendDownError();
    }

    if (!res.ok) {
      let detail: unknown = null;
      try {
        detail = await res.json();
      } catch {
        // ignore
      }
      const msg =
        (detail && typeof detail === "object" && "error" in detail
          ? String((detail as { error: string }).error)
          : null) ?? `HTTP ${res.status} ${res.statusText}`;
      console.error(`[api] ${init?.method ?? "GET"} ${path} → ${res.status}: ${msg}`);
      throw new ApiError(res.status, msg, detail);
    }

    return (await res.json()) as T;
  }

  return {
    base: API_BASE,
    raw: request,
    campaigns: {
      list: () => request<Campaign[]>("/api/campaigns"),
      get: (id: string) => request<Campaign>(`/api/campaigns/${id}`),
      create: (body: CreateCampaignInput) =>
        request<Campaign>("/api/campaigns", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      launch: (id: string) =>
        request<LaunchResult>(`/api/campaigns/${id}/launch`, { method: "POST" }),
    },
    insights: {
      list: (campaignId: string, params?: InsightParams) => {
        const q = new URLSearchParams();
        if (params?.semantic_type) q.set("semantic_type", params.semantic_type);
        if (params?.limit) q.set("limit", String(params.limit));
        if (params?.offset) q.set("offset", String(params.offset));
        return request<VseInsight[]>(`/api/campaigns/${campaignId}/insights?${q}`);
      },
    },
    clusters: {
      list: (campaignId: string) =>
        request<Cluster[]>(`/api/campaigns/${campaignId}/clusters`),
    },
    hypotheses: {
      list: (campaignId: string) =>
        request<Hypothesis[]>(`/api/campaigns/${campaignId}/hypotheses`),
    },
    interviews: {
      list: (campaignId: string) =>
        request<Interview[]>(`/api/campaigns/${campaignId}/interviews`),
    },
    participants: {
      list: (campaignId: string) =>
        request<Participant[]>(`/api/campaigns/${campaignId}/participants`),
      create: (campaignId: string, body: ParticipantInput) =>
        request<Participant>(`/api/campaigns/${campaignId}/participants`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      update: (id: string, body: ParticipantInput) =>
        request<Participant>(`/api/participants/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/api/participants/${id}`, { method: "DELETE" }),
      invite: (id: string, opts?: { reset?: boolean }) =>
        request<InviteResult>(`/api/participants/${id}/invite`, {
          method: "POST",
          body: JSON.stringify(opts ?? {}),
        }),
    },
    stats: (campaignId: string) =>
      request<CampaignStats>(`/api/campaigns/${campaignId}/stats`),
    auth: {
      sendMagicLink: (email: string) =>
        request<{ ok: boolean; dev_link?: string }>("/api/auth/magic-link", {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
    },
    health: () => request<{ status: string }>("/health"),
  };
}

// Default no-cookie API for convenience
export const api = makeApi();

/** Verify a magic link token and return the Set-Cookie header from the backend. */
export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/auth/verify/${token}`);
  if (!res.ok) {
    console.error(`[auth] verify failed: ${res.status} ${res.statusText}`);
    return null;
  }
  return res.headers.get("set-cookie");
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  org_name: string;
  company_context: string;
  language: string;
  voice_id: number;
  interview_length_min: number;
  status: string;
  created_at: string;
}

export interface CreateCampaignInput {
  org_name: string;
  company_context: string;
  language?: string;
  voice_id?: number;
  interview_length_min?: number;
}

export interface InsightParams {
  semantic_type?: string;
  limit?: number;
  offset?: number;
}

export interface VseInsight {
  id: string;
  interview_id: string;
  campaign_id: string;
  semantic_type: string;
  content: string;
  verbatim_quote?: string;
  phase: string;
  department?: string;
  confidence?: number;
  created_at: string;
}

export interface Cluster {
  id: string;
  campaign_id: string;
  label: string;
  description?: string;
  category?: string;
  signal_strength: number;
  departments: string[];
}

export interface Hypothesis {
  id: string;
  campaign_id: string;
  statement: string;
  validation_state: string;
  n_supporting: number;
  n_contradicting: number;
  dept_coverage: string[];
  confidence_score: number;
}

export interface MapData {
  nodes: Cluster[];
  hypotheses: Hypothesis[];
}

export interface Interview {
  id: string;
  campaign_id: string;
  participant_id: string;
  anon_id: string;
  department?: string;
  role_category?: string;
  mode: string;
  status: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  processing_status?: string;
}

export interface CampaignStats {
  participants: number;
  interviews_completed: number;
  interviews_in_progress: number;
  insights: number;
  hypotheses: number;
}

export interface LaunchResult {
  ok: boolean;
  sent: number;
  skipped: number;
  failed: number;
  errors?: string[];
  message?: string;
}

export interface Participant {
  id: string;
  campaign_id: string;
  email: string;
  name?: string;
  department?: string;
  role?: string;
  anon_id: string;
  interview_token: string;
  token_used?: boolean;
  token_expires: string;
  email_sent?: boolean;
  email_sent_at?: string;
  created_at?: string;
}

export interface ParticipantInput {
  email: string;
  name?: string | null;
  department?: string | null;
  role?: string | null;
}

export interface InviteResult {
  ok: boolean;
  sent?: boolean;
  dev_link?: string;
  error?: string;
}
