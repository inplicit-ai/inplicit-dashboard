const API_BASE = process.env.API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

export class BackendDownError extends Error {
  constructor() {
    super(`Backend not reachable at ${API_BASE}.`);
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
      res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
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
        if (params?.limit) q.set("limit", String(params.limit));
        if (params?.offset) q.set("offset", String(params.offset));
        return request<VseInsight[]>(`/api/campaigns/${campaignId}/insights?${q}`);
      },
    },
    synthesisConfig: {
      get: (campaignId: string) =>
        request<SynthesisConfig>(
          `/api/campaigns/${campaignId}/synthesis-config`,
        ),
      update: (campaignId: string, body: SynthesisConfig) =>
        request<SynthesisConfig>(
          `/api/campaigns/${campaignId}/synthesis-config`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          },
        ),
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
      detail: (interviewId: string) =>
        request<InterviewDetail>(`/api/interviews/${interviewId}`),
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
      setPassword: (password: string) =>
        request<{ ok: boolean }>("/api/auth/set-password", {
          method: "POST",
          body: JSON.stringify({ password }),
        }),
    },
    orgs: {
      me: () => request<Organization>("/api/orgs/me"),
      updateMe: (body: UpdateOrgInput) =>
        request<Organization>("/api/orgs/me", {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
    },
    me: () => request<Me>("/api/me"),
    staff: {
      orgs: {
        list: () => request<Organization[]>("/api/staff/orgs"),
        get: (id: string) => request<Organization>(`/api/staff/orgs/${id}`),
        create: (body: ProvisionOrgInput) =>
          request<ProvisionOrgResponse>("/api/staff/orgs", {
            method: "POST",
            body: JSON.stringify(body),
          }),
        update: (id: string, body: UpdateOrgInput) =>
          request<Organization>(`/api/staff/orgs/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          }),
        suspend: (id: string) =>
          request<{ ok: boolean }>(`/api/staff/orgs/${id}/suspend`, {
            method: "POST",
          }),
        remove: (id: string) =>
          request<{ ok: boolean }>(`/api/staff/orgs/${id}`, {
            method: "DELETE",
          }),
        issueMagicLink: (id: string) =>
          request<{
            ok: boolean;
            owner_email: string;
            email_sent: boolean;
            magic_link?: string;
            email_error?: string;
          }>(
            `/api/staff/orgs/${id}/issue-magic-link`,
            { method: "POST" },
          ),
      },
      users: {
        list: () => request<StaffUserSummary[]>("/api/staff/users"),
        create: (body: CreateStaffInput) =>
          request<CreateStaffResponse>("/api/staff/users", {
            method: "POST",
            body: JSON.stringify(body),
          }),
        issueMagicLink: (id: string) =>
          request<{
            ok: boolean;
            owner_email: string;
            magic_link: string;
            email_sent: boolean;
            email_error?: string;
          }>(`/api/staff/users/${id}/issue-magic-link`, {
            method: "POST",
          }),
        remove: (id: string) =>
          request<{ ok: boolean }>(`/api/staff/users/${id}`, {
            method: "DELETE",
          }),
      },
    },
    health: () => request<{ status: string }>("/health"),
    orgMembers: {
      list: () => request<OrgMember[]>("/api/orgs/me/members"),
      invite: (email: string) =>
        request<OrgMemberInvite>("/api/orgs/me/members", {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/api/orgs/me/members/${id}`, {
          method: "DELETE",
        }),
    },
  };
}

export const api = makeApi();

/** Verify a magic link token and return the Set-Cookie header from the backend. */
export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/auth/verify/${token}`, { cache: "no-store" });
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
  limit?: number;
  offset?: number;
}

export interface VseInsight {
  id: string;
  interview_id: string;
  campaign_id: string;
  problem_statement: string;
  human_solution?: string | null;
  business_opportunity?: string | null;
  origin_solution?: "HUMAN" | "AI" | null;
  utterance_ids: string[];
  phase: string;
  department?: string;
  cluster_id?: string | null;
  confidence?: number;
  created_at: string;
}

export interface SynthesisConfig {
  vector_weights: {
    problem: number;
    solution: number;
    opportunity: number;
  };
  thresholds: {
    tau_assign: number;
    tau_create: number;
    tau_merge: number;
    tau_meta: number;
  };
  signal: {
    phase1_weight: number;
    phase2_weight: number;
    emit_threshold: number;
    min_departments: number;
  };
  hypothesis: {
    verify_confidence: number;
    verify_min_supporters: number;
    reject_min_contradictors: number;
    reject_max_confidence: number;
    evolve_min_each: number;
    department_target: number;
  };
  meta_synthesis: {
    min_verified_clusters: number;
    min_departments: number;
    discovery_interval_seconds: number;
  };
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
  /** SEED | PENDING | EVOLVING | VERIFIED | REJECTED */
  validation_state: string;
  n_supporting: number;
  n_contradicting: number;
  dept_coverage: string[];
  confidence_score: number;
  parent_hypothesis_id?: string | null;
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

export interface Utterance {
  id: string;
  interview_id: string;
  speaker: "agent" | "participant";
  utterance_index: number;
  text: string;
  phase: string;
  timestamp_start?: number;
  timestamp_end?: number;
  created_at?: string;
}

export interface InterviewDetail {
  interview: Interview;
  utterances: Utterance[];
  insights: VseInsight[];
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
  latest_interview_status?: string | null;
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

// ─── Multi-tenancy types ───────────────────────────────────────────────────

export type Role = "INPLICIT_ADMIN" | "INPLICIT_STAFF" | "ORG_OWNER" | "ORG_MEMBER";

export interface OrgMember {
  id: string;
  email: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface OrgMemberInvite {
  invite_id: string;
  email: string;
  magic_link?: string;
}

export interface StaffUserSummary {
  id: string;
  email: string;
  name: string;
  role: "INPLICIT_STAFF";
  email_verified_at?: string | null;
  last_login_at?: string | null;
  created_at?: string | null;
}

export interface CreateStaffInput {
  email: string;
  name: string;
  issue_magic_link?: boolean;
}

export interface CreateStaffResponse {
  user: StaffUserSummary;
  magic_link?: string;
  email_sent?: boolean;
  email_error?: string;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  role: Role;
  org_id?: string | null;
  org?: Organization | null;
  email_verified_at?: string | null;
  last_login_at?: string | null;
  must_set_password?: boolean | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  company_context: string;
  industry?: string | null;
  default_locale: string;
  default_voice_id: number;
  default_interview_length_min: number;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ProvisionOrgInput {
  name: string;
  slug: string;
  company_context: string;
  industry?: string;
  default_locale?: string;
  default_voice_id?: number;
  default_interview_length_min?: number;
  owner_email: string;
  owner_name: string;
  issue_magic_link?: boolean;
}

export interface ProvisionOrgResponse {
  org: Organization;
  owner: Me;
  magic_link?: string;
  email_sent?: boolean;
  email_error?: string;
}

export interface UpdateOrgInput {
  name?: string;
  company_context?: string;
  industry?: string;
  default_locale?: string;
  default_voice_id?: number;
  default_interview_length_min?: number;
  /** Empty string clears the logo. Omit the field to leave it untouched. */
  logo_url?: string;
}
