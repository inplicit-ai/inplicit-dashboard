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
    scheduling: {
      listSlots: (campaignId: string) =>
        request<{ slots: BookingSlot[] }>(`/api/campaigns/${campaignId}/slots`),
      createSlots: (campaignId: string, slots: SlotInput[]) =>
        request<{ slots: BookingSlot[] }>(`/api/campaigns/${campaignId}/slots`, {
          method: "POST",
          body: JSON.stringify({ slots }),
        }),
      deleteSlot: (campaignId: string, slotId: string) =>
        request<{ ok: boolean }>(
          `/api/campaigns/${campaignId}/slots/${slotId}`,
          { method: "DELETE" },
        ),
      createBooking: (campaignId: string, body: CreateBookingInput) =>
        request<BookingResult>(`/api/campaigns/${campaignId}/bookings`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      cancelBooking: (campaignId: string, bookingId: string) =>
        request<BookingResult>(
          `/api/campaigns/${campaignId}/bookings/${bookingId}`,
          { method: "PATCH", body: JSON.stringify({ action: "cancel" }) },
        ),
      listTemplates: (campaignId: string) =>
        request<{ templates: CampaignEmailTemplate[] }>(
          `/api/campaigns/${campaignId}/email-templates`,
        ),
      putTemplate: (campaignId: string, body: PutTemplateInput) =>
        request<{ template: CampaignEmailTemplate }>(
          `/api/campaigns/${campaignId}/email-templates`,
          { method: "PUT", body: JSON.stringify(body) },
        ),
    },
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
    setup: {
      /** Create a draft from the launchpad prompt. */
      createSession: (body: CreateSetupSessionInput) =>
        request<SetupSessionCreated>("/api/orgs/me/setup-sessions", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      /** Load a draft + chat history (restore split state). */
      getSession: (id: string) =>
        request<SetupSession>(`/api/orgs/me/setup-sessions/${id}`),
      /** Apply a user-originated catalog edit as a new immutable revision. */
      patchDraft: (id: string, body: SetupPatchInput) =>
        request<SetupDraftState>(`/api/orgs/me/setup-drafts/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      /** Validate + materialize the draft into a campaign row. */
      launchDraft: (id: string) =>
        request<SetupLaunchResult>(`/api/orgs/me/setup-drafts/${id}/launch`, {
          method: "POST",
        }),
      /**
       * SSE URL for an agent turn. The browser POSTs the message here and reads
       * the event stream directly (via the same-origin /dapi proxy is not used —
       * SSE needs an unbuffered passthrough, see SetupChat).
       */
      messagesPath: (id: string) =>
        `/api/orgs/me/setup-sessions/${id}/messages`,
    },
    me: () => request<Me>("/api/me"),
    /** O-10: mark the first-visit guided overview as completed/skipped. */
    completeTour: () =>
      request<{ ok: boolean }>("/api/me/tour-complete", { method: "POST" }),
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
    // ── Per-campaign RAG chat (O-7) ─────────────────────────────────────
    campaignChat: {
      listThreads: (campaignId: string) =>
        request<ChatThreadSummary[]>(
          `/api/campaigns/${campaignId}/chat/threads`,
        ),
      createThread: (campaignId: string) =>
        request<ChatThreadSummary>(
          `/api/campaigns/${campaignId}/chat/threads`,
          { method: "POST" },
        ),
      getThread: (campaignId: string, threadId: string) =>
        request<ChatThreadDetail>(
          `/api/campaigns/${campaignId}/chat/threads/${threadId}`,
        ),
      sendMessage: (campaignId: string, threadId: string, content: string) =>
        request<SendChatMessageResponse>(
          `/api/campaigns/${campaignId}/chat/threads/${threadId}/messages`,
          { method: "POST", body: JSON.stringify({ content }) },
        ),
      deleteThread: (campaignId: string, threadId: string) =>
        request<void>(
          `/api/campaigns/${campaignId}/chat/threads/${threadId}`,
          { method: "DELETE" },
        ),
    },
    refine: {
      info: (campaignId: string) =>
        request<RefineInfo>(`/api/campaigns/${campaignId}/refine`),
    },
    // ── Org dashboard (O-8) ─────────────────────────────────────────────
    org: {
      interviews: () => request<OrgInterviewRow[]>("/api/orgs/me/interviews"),
      stats: () => request<OrgStats>("/api/orgs/me/stats"),
    },
    // ── Cross-campaign Knowledge Chat (O-8) ─────────────────────────────
    knowledgeChat: {
      listThreads: () =>
        request<ChatThreadSummary[]>("/api/orgs/me/rag-threads"),
      createThread: () =>
        request<ChatThreadSummary>("/api/orgs/me/rag-threads", {
          method: "POST",
        }),
      getThread: (threadId: string) =>
        request<OrgThreadDetail>(`/api/orgs/me/rag-threads/${threadId}`),
      sendMessage: (threadId: string, content: string) =>
        request<SendOrgChatResponse>(
          `/api/orgs/me/rag-threads/${threadId}/messages`,
          { method: "POST", body: JSON.stringify({ content }) },
        ),
      deleteThread: (threadId: string) =>
        request<void>(`/api/orgs/me/rag-threads/${threadId}`, {
          method: "DELETE",
        }),
    },
    // ── Context Vaults (O-8) ────────────────────────────────────────────
    vaults: {
      list: () => request<Vault[]>("/api/orgs/me/vaults"),
      create: (body: NewVaultInput) =>
        request<Vault>("/api/orgs/me/vaults", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      remove: (id: string) =>
        request<void>(`/api/orgs/me/vaults/${id}`, { method: "DELETE" }),
      listItems: (id: string) =>
        request<VaultItem[]>(`/api/orgs/me/vaults/${id}/items`),
      addItem: (id: string, body: NewVaultItemInput) =>
        request<VaultItem>(`/api/orgs/me/vaults/${id}/items`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },
    // ── Integrations registry (O-8) ─────────────────────────────────────
    integrations: {
      list: () => request<IntegrationView[]>("/api/orgs/me/integrations"),
      install: (body: InstallIntegrationInput) =>
        request<{ id: string; provider: string; status: string }>(
          "/api/orgs/me/integrations",
          { method: "POST", body: JSON.stringify(body) },
        ),
      setStatus: (id: string, status: IntegrationStatus) =>
        request<{ id: string; status: string }>(
          `/api/orgs/me/integrations/${id}`,
          { method: "PATCH", body: JSON.stringify({ status }) },
        ),
      remove: (id: string) =>
        request<void>(`/api/orgs/me/integrations/${id}`, { method: "DELETE" }),
    },
    // ── Digital Twin (O-9) ──────────────────────────────────────────────
    twin: {
      listRoles: () => request<TwinRole[]>("/api/orgs/me/roles"),
      createRole: (body: NewTwinRoleInput) =>
        request<TwinRole>("/api/orgs/me/roles", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      graph: () => request<TwinGraph>("/api/orgs/me/twin/graph"),
      detail: (roleId: string) =>
        request<TwinDetail>(`/api/orgs/me/twin/${roleId}`),
      simulate: (campaignId: string) =>
        request<SimulateResult>(`/api/campaigns/${campaignId}/simulate`, {
          method: "POST",
        }),
      personas: (campaignId: string) =>
        request<SimulatedPersona[]>(`/api/campaigns/${campaignId}/personas`),
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
  /** O-10: NULL → first-visit guided overview not yet seen. */
  onboarding_tour_completed_at?: string | null;
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

// ─── Setup agent (O-3) ──────────────────────────────────────────────────────

export type Locale = "de" | "en";

/** Immutable campaign-config draft. Patched by both user and agent tool calls
 *  via the pure `applyPatch` reducer (lib/setup/draftReducer.ts). */
export interface CampaignDraft {
  status?: "drafting" | "review" | "launched";
  interviewType?: "voice" | "chat";
  durationMin?: number;
  language?: { default: Locale; allowSwitch: boolean };
  prompt?: string;
  goals?: Goal[];
  background?: { notes: string; files: FileRef[] };
  topics?: TopicGraph;
  successCriteria?: SuccessCriteria;
  inductiveFlag?: boolean;
  mustAsk?: { mode: "questions" | "prove_hypothesis"; items: MustAskItem[] };
  proveHypothesisMode?: boolean;
  audience?: { segments: string[]; filters: Record<string, unknown> };
  people?: Person[];
  schedule?: ScheduleConfig;
  emailTemplate?: EmailTemplate;
  [key: string]: unknown;
}

/** A participant entry in the audience editor (O-5). PII stays client-side
 *  until launch materialises participants on the backend. */
export interface Person {
  name?: string;
  email: string;
}

/** Booking-based scheduling (O-5). `mode: "instant"` keeps the legacy
 *  per-upload instant-link flow; `mode: "slots"` requires a booked slot. */
export interface ScheduleConfig {
  mode: "slots" | "instant";
  /** ISO 8601 window the slots are generated within. */
  windowStart?: string;
  windowEnd?: string;
  slotLengthMin?: number;
  timezone?: string;
  /** Locally-generated preview slots before launch persists them. */
  slots?: ScheduleSlot[];
}
export interface ScheduleSlot {
  startsAt: string;
  endsAt: string;
}

/** Editable invite-email template with token placeholders rendered live. */
export interface EmailTemplate {
  subject: string;
  body: string;
}

// ── Backend scheduling DTOs (mirror backend/src/db/scheduling.rs) ──────────
export interface BookingSlot {
  id: string;
  campaign_id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  booked_count: number;
  timezone: string;
  created_at: string;
}
export interface SlotInput {
  starts_at: string;
  ends_at: string;
  capacity?: number;
  timezone?: string;
}
export interface CreateBookingInput {
  slot_id: string;
  participant_id: string;
  send_invite?: boolean;
}
export interface BookingResult {
  ok: boolean;
  sent?: boolean;
  booking: {
    id: string;
    slot_id: string;
    participant_id: string;
    status: string;
    ics_uid: string;
    ics_sequence: number;
  };
  dev_link?: string;
  error?: string;
}
export interface CampaignEmailTemplate {
  id: string;
  campaign_id: string;
  kind: "INVITE" | "REMINDER" | "RESUME" | "THANK_YOU";
  locale: string;
  subject: string;
  body: string;
  updated_at: string;
}
export interface PutTemplateInput {
  kind: "INVITE" | "REMINDER" | "RESUME" | "THANK_YOU";
  locale?: string;
  subject: string;
  body: string;
}

export interface Goal {
  id: string;
  text: string;
  needsNarrowing?: boolean;
}
export interface FileRef {
  id: string;
  name: string;
  s3_key?: string;
}
export interface TopicGraph {
  nodes: TopicNode[];
  edges: TopicEdge[];
}
/** Qualitative method an exploration angle is probed with (mirrors
 *  `VALID_METHODS` / `template::Method` server-side). */
export type TopicMethod = "cit" | "journey" | "jtbd" | "laddering" | "paired_cit";
export interface TopicNode {
  id: string;
  title: string;
  summary?: string;
  /** The research method tagged onto this angle (set by the CLASSIFY template). */
  method?: TopicMethod;
  /** A critical-incident anchor prompt — set on the lead angle only. */
  incidentPrompt?: string;
  bidirectional?: boolean;
  /** Emphasis set by conversational refinement ("focus more/less on X"). */
  weight?: "primary" | "normal" | "muted";
}
export interface TopicEdge {
  a: string;
  b: string;
  relation: string;
}
export interface SuccessCriteria {
  mode: "deductive" | "inductive";
  questions: string[];
  hypotheses: string[];
}
export interface MustAskItem {
  id: string;
  text: string;
}

/** A field-scoped tool call — the unit both the agent and the user produce. */
export interface SetupToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface SetupMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls: SetupToolCallCard[];
  created_at?: string;
}

/** A tool call as rendered in the chat (carries the applied revision). */
export interface SetupToolCallCard {
  tool: string;
  args: Record<string, unknown>;
  revision?: number;
  applied?: boolean;
}

export interface CreateSetupSessionInput {
  prompt?: string;
  locale?: Locale;
}
export interface SetupSessionCreated {
  session_id: string;
  draft_id: string;
  revision: number;
  config: CampaignDraft;
}
export interface SetupSession {
  session_id: string;
  draft_id: string;
  revision: number;
  status: string;
  config: CampaignDraft;
  messages: SetupMessage[];
}
export interface SetupPatchInput {
  patch: SetupToolCall;
  base_rev?: number;
}
export interface SetupDraftState {
  revision: number;
  config: CampaignDraft;
}
export interface SetupLaunchResult {
  ok: boolean;
  campaign_id: string;
  status: string;
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

// ── RAG chat DTOs (mirror backend/src/api/campaign_chat.rs) ────────────────
/** One inline citation chip. Pseudonymous — never participant email/name. */
export interface ChatCitation {
  vse_insight_id: string;
  utterance_index: number;
  anon_id: string;
}
export interface ChatThreadSummary {
  id: string;
  title: string;
  updated_at: string;
}
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: ChatCitation[];
  declined: boolean;
  cached: boolean;
  created_at: string;
}
export interface ChatThreadDetail {
  id: string;
  title: string;
  messages: ChatMessage[];
}
export interface SendChatMessageResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

// ── Org dashboard DTOs (mirror backend/src/api/org_dashboard.rs) ───────────
export interface OrgInterviewRow {
  id: string;
  campaign_id: string;
  campaign_label: string;
  anon_id: string;
  status: string;
  language?: string;
  duration_seconds?: number;
  department?: string;
  created_at?: string;
  ended_at?: string;
}
export interface OrgStats {
  campaigns: number;
  interviews_total: number;
  interviews_completed: number;
  interviews_in_progress: number;
  insights: number;
  hypotheses: number;
}

// ── Knowledge Chat DTOs (mirror backend/src/api/knowledge_chat.rs) ─────────
/** Org citation carries the campaign so the UI can label + link across campaigns. */
export interface OrgCitation {
  vse_insight_id: string;
  utterance_index: number;
  anon_id: string;
  campaign_id: string;
}
export interface OrgChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: OrgCitation[];
  declined: boolean;
  cached: boolean;
  created_at: string;
}
export interface OrgThreadDetail {
  id: string;
  title: string;
  scope_campaigns: number;
  messages: OrgChatMessage[];
}
export interface SendOrgChatResponse {
  user_message: OrgChatMessage;
  assistant_message: OrgChatMessage;
}

// ── Context Vault DTOs (mirror backend/src/api/vaults.rs) ──────────────────
export interface Vault {
  id: string;
  name: string;
  description?: string;
  scope: "ORG" | "CAMPAIGN";
  campaign_id?: string;
  created_at: string;
  updated_at: string;
}
export interface NewVaultInput {
  name: string;
  description?: string;
  scope?: "ORG" | "CAMPAIGN";
  campaign_id?: string;
}
export interface VaultItem {
  id: string;
  kind: "TEXT" | "URL" | "FILE";
  title?: string;
  content?: string;
  mime?: string;
  byte_size?: number;
  embedded: boolean;
  created_at: string;
}
export interface NewVaultItemInput {
  kind: "TEXT" | "URL" | "FILE";
  title?: string;
  content?: string;
  s3_key?: string;
  mime?: string;
  byte_size?: number;
}

// ── Integration DTOs (mirror backend/src/api/integrations.rs) ──────────────
export type IntegrationStatus = "CONNECTED" | "DISABLED" | "ERROR";
export interface IntegrationView {
  key: string;
  name: string;
  description: string;
  category: string;
  requires_secret: boolean;
  installed: boolean;
  install_id?: string;
  status?: IntegrationStatus;
  config?: Record<string, unknown>;
  has_secret: boolean;
}
export interface InstallIntegrationInput {
  provider: string;
  config?: Record<string, unknown>;
  secret?: string;
}

// ── Refine lock matrix DTOs (mirror backend/src/api/refine.rs) ─────────────
export type RefineFieldKey =
  | "company_context"
  | "objectives"
  | "interview_length"
  | "phase_split"
  | "embedding_model"
  | "clustering_thresholds"
  | "participant_list"
  | "stt_tts_provider"
  | "language";
export interface RefineFieldLock {
  field: RefineFieldKey;
  locked: boolean;
  mode: "editable" | "append_only" | "future_only" | "locked";
}
export interface RefineInfo {
  campaign_id: string;
  status: string;
  has_interviews: boolean;
  fields: RefineFieldLock[];
}

// ── Digital Twin DTOs (mirror backend/src/api/twins.rs) ────────────────────
export interface TwinRole {
  id: string;
  name: string;
  description: string | null;
  source: "ESCO" | "GENERATED" | "MANUAL";
  confirmed: boolean;
  embedded: boolean;
  /** True once the role's twin has VALIDATED data from real interviews. */
  has_validated: boolean;
}
export interface NewTwinRoleInput {
  name: string;
  description?: string;
  esco_uri?: string;
  source?: "ESCO" | "GENERATED" | "MANUAL";
}
export interface TwinGraphNode {
  id: string;
  name: string;
  /** "validated" = solid node; "predicted" = dashed (predicted-only). */
  kind: "validated" | "predicted";
  confidence: number;
}
export interface TwinGraphEdge {
  from: string;
  to: string;
  relation: "reports_to" | "manages";
}
export interface TwinGraph {
  nodes: TwinGraphNode[];
  edges: TwinGraphEdge[];
}
export interface TwinDetail {
  role_id: string;
  role_name: string;
  /** null when the role has never been refined (predicted-only / cold). */
  model: TwinModel | null;
  confidence: number;
  version: number;
  /** Always true for the simulated layer — drives the SIMULATION badge. */
  is_simulation: boolean;
}
export interface TwinPain {
  pain: string;
  confidence?: number;
  source?: string;
}
export interface TwinModel {
  predicted_pains?: TwinPain[];
  validated_pains?: TwinPain[];
  divergence?: { pain: string; kind: string }[];
}
export interface SimulateResult {
  run_id: string;
  persona_count: number;
  seed_hypotheses: string[];
}
export interface SimulatedPersona {
  id: string;
  role_id: string;
  synthetic_profile: Record<string, unknown>;
  is_simulation: boolean;
}
