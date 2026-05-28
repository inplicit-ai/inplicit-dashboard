// Shared interview-room types (O-6). Mirrors the backend `protocol.rs`
// ServerMessage/ClientMessage envelope v2 so the contract is single-sourced.

export type ConnState = "connecting" | "open" | "reconnecting" | "paused" | "closed" | "error";
export type Stage = "preflight" | "live" | "resume" | "ended";
export type LiveView = "voice" | "chat";
export type AgentStatus = "idle" | "listening" | "thinking" | "speaking";
export type Phase = "open" | "validation";

export type Msg =
  | { id: string; role: "agent"; text: string; streaming: boolean }
  | { id: string; role: "user"; text: string };

export interface Latency {
  stt_ms?: number;
  llm_ttft_ms?: number;
  tts_ttfb_ms?: number;
  round_trip_ms?: number;
}

/** Loose superset of every server message field we read. */
export interface ServerMessage {
  type: string;
  text?: string;
  is_final?: boolean;
  data?: string;
  sample_rate?: number;
  phase?: string;
  status?: string;
  summary?: string;
  message?: string;
  reason?: string;
  language?: string;
  elapsed_s?: number;
  remaining_s?: number;
  resume_path?: string;
  // latency payload (flattened)
  stt_ms?: number;
  llm_ttft_ms?: number;
  tts_ttfb_ms?: number;
  round_trip_ms?: number;
}
