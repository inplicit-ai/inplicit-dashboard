"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/interview/TopBar";
import { StatusHud } from "@/components/interview/StatusHud";
import { VoiceControls } from "@/components/interview/VoiceControls";
import { VoiceOrb } from "@/components/interview/VoiceOrb";
import { Transcript } from "@/components/interview/Transcript";
import { PreflightCard } from "@/components/interview/PreflightCard";
import { EndedView } from "@/components/interview/EndedView";
import { ResumeView } from "@/components/interview/ResumeView";
import {
  type Lang,
  detectBrowserLang,
  normalizeLang,
  roomCopy,
} from "@/components/interview/copy";
import type {
  AgentStatus,
  ConnState,
  Latency,
  LiveView,
  Msg,
  ServerMessage,
  Stage,
} from "@/components/interview/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  /** Live interview WebSocket URL. */
  wsUrl: string;
  /** Invite token (used for the pause REST endpoint). */
  token?: string;
  /** API base for control endpoints (e.g. http://localhost:8080). */
  apiBase?: string;
  /** When set, this mount is a resume (arrived via /interview/resume/:t). */
  isResume?: boolean;
  /** Default interview length (minutes) for the top-bar ring fallback. */
  lengthMin?: number;
}

const ORB_DESKTOP = 160;
const ORB_MOBILE = 120;

export function InterviewRoom({
  wsUrl,
  token,
  apiBase,
  isResume = false,
  lengthMin = 25,
}: Props) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBufferQueue | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micWorkletRef = useRef<AudioWorkletNode | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const levelRef = useRef(0);
  const agentStreamingRef = useRef(false);
  const mutedRef = useRef(false);
  const completedRef = useRef(false);

  const [conn, setConn] = useState<ConnState>("connecting");
  const [stage, setStage] = useState<Stage>(isResume ? "resume" : "preflight");
  const [liveView, setLiveView] = useState<LiveView>("voice");
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [interimUser, setInterimUser] = useState("");
  const [draft, setDraft] = useState("");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [latency, setLatency] = useState<Latency>({});
  const [elapsedS, setElapsedS] = useState(0);
  const [remainingS, setRemainingS] = useState(lengthMin * 60);
  const [endedSummary, setEndedSummary] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [language, setLanguage] = useState<Lang>(detectBrowserLang());
  const [langLocked, setLangLocked] = useState(false);
  const [endDialog, setEndDialog] = useState(false);

  const c = roomCopy(language);

  // ── WebSocket lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      setConn("open");
      // Tell the server the chosen language before the first turn.
      try {
        ws.send(JSON.stringify({ type: "set_language", lang: language }));
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => setConn((s) => (completedRef.current ? "closed" : "reconnecting"));
    ws.onerror = () => setConn("error");
    ws.onmessage = (event) => {
      try {
        handleServerMessage(JSON.parse(event.data) as ServerMessage);
      } catch {
        /* ignore malformed */
      }
    };
    return () => {
      ws.close();
      stopRecording();
      audioQueueRef.current?.cancel();
      audioCtxRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl]);

  // Stick-to-bottom on new content.
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, interimUser]);

  // Local clock fallback while live (server `time` overrides when it arrives).
  useEffect(() => {
    if (stage !== "live" || paused) return;
    const id = setInterval(() => {
      setElapsedS((e) => e + 1);
      setRemainingS((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [stage, paused]);

  function handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case "session_init":
        setLanguage(normalizeLang(msg.language));
        break;
      case "agent_status":
        if (isAgentStatus(msg.status)) setAgentStatus(msg.status);
        break;
      case "latency":
        setLatency({
          stt_ms: msg.stt_ms,
          llm_ttft_ms: msg.llm_ttft_ms,
          tts_ttfb_ms: msg.tts_ttfb_ms,
          round_trip_ms: msg.round_trip_ms,
        });
        break;
      case "time":
        if (typeof msg.elapsed_s === "number") setElapsedS(msg.elapsed_s);
        if (typeof msg.remaining_s === "number") setRemainingS(msg.remaining_s);
        break;
      case "voice_ready":
        setAgentStatus("listening");
        startRecording().catch(() => {
          setErrorMsg(c.micNotice);
          setLiveView("chat");
        });
        break;
      case "agent_text":
        appendAgentText(msg.text ?? "", msg.is_final ?? false);
        setAgentStatus(msg.is_final ? "listening" : "speaking");
        break;
      case "transcript":
        if (msg.is_final && msg.text) {
          appendUserMessage(msg.text);
          setInterimUser("");
        } else if (!msg.is_final) {
          setInterimUser(msg.text ?? "");
          setAgentStatus("listening");
        }
        break;
      case "agent_audio":
        if (msg.data) enqueuePcm16(msg.data, msg.sample_rate ?? 24000);
        break;
      case "interrupt":
        audioQueueRef.current?.cancel();
        agentStreamingRef.current = false;
        break;
      case "phase_change":
        // Phase surfaced via HUD/length only for participants; no extra UI.
        break;
      case "paused":
        setPaused(true);
        setConn("paused");
        break;
      case "resumed":
        setPaused(false);
        setConn("open");
        if (typeof msg.elapsed_s === "number") setElapsedS(msg.elapsed_s);
        break;
      case "interview_end":
        completedRef.current = true;
        setEndedSummary(msg.summary ?? msg.reason ?? null);
        setStage("ended");
        stopRecording();
        try {
          wsRef.current?.close(1000, "interview_end");
        } catch {
          /* ignore */
        }
        break;
      case "error":
        setErrorMsg(msg.message ?? "Error.");
        break;
    }
  }

  function appendAgentText(tokenStr: string, isFinal: boolean) {
    agentStreamingRef.current = !isFinal;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "agent" && last.streaming) {
        if (isFinal && tokenStr === "") {
          return [...prev.slice(0, -1), { ...last, streaming: false }];
        }
        return [
          ...prev.slice(0, -1),
          { ...last, text: last.text + tokenStr, streaming: !isFinal },
        ];
      }
      if (tokenStr === "" && isFinal) return prev;
      return [
        ...prev,
        { id: crypto.randomUUID(), role: "agent", text: tokenStr, streaming: !isFinal },
      ];
    });
  }

  function appendUserMessage(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
  }

  const getOrbLevel = useCallback((): number => {
    const queue = audioQueueRef.current;
    let target = 0;
    if (queue && queue.isPlaying()) target = queue.currentLevel();
    else if (agentStreamingRef.current) target = 0.26;
    const prev = levelRef.current;
    const k = target > prev ? 0.35 : 0.08;
    levelRef.current = prev + (target - prev) * k;
    return levelRef.current;
  }, []);

  function enqueuePcm16(b64: string, sampleRate: number) {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!audioQueueRef.current) audioQueueRef.current = new AudioBufferQueue(ctx);
    audioQueueRef.current.enqueue(b64, sampleRate);
  }

  // ── Voice activation + recording ──────────────────────────────────────────
  async function enterVoice() {
    setLangLocked(true);
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();
      audioQueueRef.current = new AudioBufferQueue(audioCtxRef.current);
      wsRef.current?.send(JSON.stringify({ type: "mode_switch", mode: "voice" }));
      setStage("live");
      setLiveView("voice");
      setAgentStatus("thinking");
    } catch {
      setErrorMsg(c.micNotice);
      setStage("live");
      setLiveView("chat");
    }
  }

  function preferText() {
    setLangLocked(true);
    setStage("live");
    setLiveView("chat");
    wsRef.current?.send(JSON.stringify({ type: "mode_switch", mode: "chat" }));
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    micStreamRef.current = stream;
    const ctx = audioCtxRef.current;
    if (!ctx) throw new Error("no audio ctx");
    if (ctx.state === "suspended") await ctx.resume();
    await ctx.audioWorklet.addModule("/pcm-worklet.js");
    const source = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, "pcm-worklet");
    node.port.onmessage = (ev) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (mutedRef.current) return; // muted: no audio leaves the device
      const buffer = ev.data as ArrayBuffer;
      ws.send(JSON.stringify({ type: "audio_chunk", data: bytesToBase64(new Uint8Array(buffer)) }));
    };
    source.connect(node);
    micSourceRef.current = source;
    micWorkletRef.current = node;
  }

  function stopRecording() {
    const node = micWorkletRef.current;
    if (node) {
      try {
        node.port.onmessage = null;
        node.disconnect();
      } catch {
        /* ignore */
      }
    }
    micWorkletRef.current = null;
    try {
      micSourceRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    micSourceRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      return next;
    });
  }

  function switchToChat() {
    stopRecording();
    setLiveView("chat");
    wsRef.current?.send(JSON.stringify({ type: "mode_switch", mode: "chat" }));
  }

  async function switchToVoice() {
    setLiveView("voice");
    await enterVoice();
  }

  function sendText() {
    if (!draft.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const text = draft.trim();
    appendUserMessage(text);
    wsRef.current.send(JSON.stringify({ type: "text_message", text }));
    setDraft("");
  }

  // ── Pause / resume (O-6) ──────────────────────────────────────────────────
  async function pauseInterview() {
    setPaused(true);
    setConn("paused");
    stopRecording();
    audioQueueRef.current?.cancel();
    // Tell the live socket (best-effort) and persist via REST so a disconnect
    // after this still has the position + a resume token.
    try {
      wsRef.current?.send(JSON.stringify({ type: "pause" }));
    } catch {
      /* ignore */
    }
    if (token && apiBase) {
      try {
        await fetch(`${apiBase}/api/interview/${token}/pause`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ elapsed_seconds: elapsedS, phase: "open" }),
        });
      } catch {
        /* link still valid via inline send; ignore */
      }
    }
  }

  async function resumeInterview() {
    setPaused(false);
    setConn("open");
    try {
      wsRef.current?.send(JSON.stringify({ type: "resume" }));
    } catch {
      /* ignore */
    }
    if (liveView === "voice") {
      await startRecording().catch(() => setLiveView("chat"));
    }
  }

  function endInterview() {
    completedRef.current = true;
    try {
      wsRef.current?.send(JSON.stringify({ type: "leave" }));
    } catch {
      /* ignore */
    }
    stopRecording();
    audioQueueRef.current?.cancel();
    setStage("ended");
    try {
      wsRef.current?.close(1000, "user_left");
    } catch {
      /* ignore */
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (stage === "ended") {
    return (
      <>
        <EndedView lang={language} summary={endedSummary} />
        <RoomStyles />
      </>
    );
  }

  if (stage === "resume") {
    // Arrived via a resume link — connecting re-enters the live socket.
    return (
      <>
        <ResumeView
          lang={language}
          elapsedS={elapsedS}
          onResume={conn === "open" ? () => setStage("live") : undefined}
        />
        <RoomStyles />
      </>
    );
  }

  if (stage === "preflight") {
    return (
      <>
        <PreflightCard
          lang={language}
          onLangChange={(l) => {
            setLanguage(l);
            try {
              wsRef.current?.send(JSON.stringify({ type: "set_language", lang: l }));
            } catch {
              /* ignore */
            }
          }}
          langLocked={langLocked}
          ready={conn === "open"}
          errorMsg={errorMsg}
          onStartVoice={enterVoice}
          onPreferText={preferText}
        />
        <RoomStyles />
      </>
    );
  }

  return (
    <div className="iv-shell">
      <TopBar
        lang={language}
        elapsedS={elapsedS}
        remainingS={remainingS}
        paused={paused}
        onPause={pauseInterview}
        onResume={resumeInterview}
        onEnd={() => setEndDialog(true)}
      />

      <main className={`iv-main iv-main--${liveView}`}>
        {liveView === "voice" ? (
          <div className="iv-voice">
            <div className="iv-orb-wrap iv-orb-wrap--desktop">
              <VoiceOrb size={ORB_DESKTOP} getLevel={getOrbLevel} />
            </div>
            <div className="iv-orb-wrap iv-orb-wrap--mobile">
              <VoiceOrb size={ORB_MOBILE} getLevel={getOrbLevel} />
            </div>
            <StatusHud lang={language} agentStatus={agentStatus} conn={conn} latency={latency} />
          </div>
        ) : (
          <div className="iv-chat">
            <Transcript
              lang={language}
              messages={messages}
              interimUser={interimUser}
              scrollRef={transcriptRef}
            />
            <div className="iv-composer">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendText();
                  }
                }}
                placeholder={c.composerPlaceholder}
                rows={2}
                disabled={conn !== "open"}
                className="iv-composer__textarea"
              />
              <div className="iv-composer__actions">
                <button
                  type="button"
                  onClick={switchToVoice}
                  disabled={conn !== "open"}
                  className="btn btn--ghost btn--sm"
                >
                  {c.toVoice}
                </button>
                <button
                  type="button"
                  onClick={sendText}
                  disabled={conn !== "open" || !draft.trim()}
                  className="btn btn--primary btn--sm"
                >
                  {c.send}
                </button>
              </div>
            </div>
          </div>
        )}

        {errorMsg && <div className="flash flash--err iv-error">{errorMsg}</div>}
      </main>

      {liveView === "voice" && (
        <footer className="iv-footer">
          <VoiceControls
            lang={language}
            muted={muted}
            onToggleMute={toggleMute}
            onSwitchToChat={switchToChat}
          />
        </footer>
      )}

      <Dialog open={endDialog} onOpenChange={setEndDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{c.endConfirmTitle}</DialogTitle>
            <DialogDescription>{c.endConfirmBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEndDialog(false)}>
              {c.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setEndDialog(false);
                endInterview();
              }}
            >
              {c.confirmEnd}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RoomStyles />
    </div>
  );
}

function isAgentStatus(s: string | undefined): s is AgentStatus {
  return s === "idle" || s === "listening" || s === "thinking" || s === "speaking";
}

// ─── Shared room styles ──────────────────────────────────────────────────────

function RoomStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        .iv-shell { height: 100vh; height: 100dvh; overflow: hidden; display: flex; flex-direction: column; background: var(--color-surface); }
        .iv-main { flex: 1; width: 100%; max-width: 760px; margin: 0 auto; padding: var(--space-6); display: flex; flex-direction: column; min-height: 0; }
        .iv-main--voice { justify-content: center; align-items: center; }

        .iv-voice { display: flex; flex-direction: column; align-items: center; gap: var(--space-5); }
        .iv-orb-wrap { display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .iv-orb-wrap--mobile { display: none; }
        @media (max-width: 767px) {
          .iv-orb-wrap--desktop { display: none; }
          .iv-orb-wrap--mobile { display: flex; }
        }

        .iv-chat { display: flex; flex-direction: column; gap: var(--space-4); width: 100%; flex: 1; min-height: 0; }
        .iv-transcript { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-2) 0 var(--space-4); }
        .iv-transcript__empty { margin: auto 0; color: var(--color-text-tertiary); text-align: center; }
        .iv-bubble-row { display: flex; justify-content: flex-start; }
        .iv-bubble-row--right { justify-content: flex-end; }
        .iv-bubble { max-width: min(78%, 620px); padding: var(--space-3) var(--space-4); font-size: var(--text-body); line-height: 1.6; white-space: pre-wrap; border-radius: var(--radius-card); }
        .iv-bubble--agent { background: var(--color-surface-2); color: var(--color-text-primary); }
        .iv-bubble--user { background: var(--color-accent-soft); color: var(--color-text-primary); }
        .iv-bubble--interim { background: var(--color-surface-2); border: 1px dashed var(--color-border); color: var(--color-text-secondary); font-style: italic; }
        .iv-cursor { display: inline-block; width: 2px; height: 0.95em; margin-left: 2px; vertical-align: -2px; background: currentColor; opacity: 0.65; animation: iv-blink 1s steps(2) infinite; }
        @keyframes iv-blink { to { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .iv-cursor { animation: none; } }

        .iv-composer { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4); display: flex; align-items: flex-end; gap: var(--space-3); transition: border-color 0.15s var(--ease-smooth), box-shadow 0.15s var(--ease-smooth); }
        .iv-composer:focus-within { border-color: var(--color-accent); box-shadow: var(--shadow-focus); }
        .iv-composer__textarea { flex: 1; font-family: var(--font-family); font-size: var(--text-body); line-height: 1.6; color: var(--color-text-primary); background: transparent; border: 0; resize: none; padding: var(--space-2) 0; min-height: 40px; max-height: 160px; }
        .iv-composer__textarea:focus { outline: none; }
        .iv-composer__textarea::placeholder { color: var(--color-text-quaternary); }
        .iv-composer__actions { display: inline-flex; align-items: center; gap: var(--space-2); }

        .iv-footer { display: flex; align-items: center; justify-content: center; padding: var(--space-4) var(--space-5); padding-bottom: calc(var(--space-4) + var(--safe-bottom)); border-top: 1px solid var(--color-border-subtle); background: var(--color-surface); }

        .iv-error { margin-top: var(--space-3); align-self: stretch; }

        .iv-center { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: var(--space-8) var(--space-4); background: var(--color-surface); }
        .iv-card { max-width: 460px; width: 100%; padding: var(--space-10); text-align: left; }
        .iv-card__eyebrow { margin-top: var(--space-5); }
        .iv-card__title { margin-top: var(--space-3); font-size: clamp(1.75rem, 3vw, 2.25rem); }
        .iv-card__body { margin-top: var(--space-3); }
        .iv-card__flash { margin-top: var(--space-5); }
        .iv-card__actions { margin-top: var(--space-7); display: flex; flex-direction: column; gap: var(--space-3); }
        .iv-card__cta { width: 100%; }
        .iv-card__alt { align-self: center; font-size: var(--text-caption); }
        .iv-card__legal { margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border-subtle); line-height: 1.55; }

        @media (max-width: 640px) {
          .iv-main { padding: var(--space-4); }
          .iv-card { padding: var(--space-8); }
          .iv-bubble { max-width: 88%; }
        }
      `,
      }}
    />
  );
}

// ─── AudioBufferQueue (PCM16 playback, level metering) ───────────────────────

class AudioBufferQueue {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private freqBuf: Uint8Array;
  private playbackTime = 0;
  private active: AudioBufferSourceNode[] = [];

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.4;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;
    this.analyser.connect(ctx.destination);
    this.freqBuf = new Uint8Array(this.analyser.frequencyBinCount);
  }

  enqueue(b64: string, sampleRate: number): number {
    const bytes = base64ToBytes(b64);
    const sampleCount = bytes.length / 2;
    if (sampleCount === 0) return 0;
    const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
    const channel = buffer.getChannelData(0);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < sampleCount; i++) channel[i] = view.getInt16(i * 2, true) / 0x8000;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyser);
    const startAt = Math.max(this.ctx.currentTime, this.playbackTime);
    source.start(startAt);
    this.playbackTime = startAt + buffer.duration;
    this.active.push(source);
    source.onended = () => {
      this.active = this.active.filter((s) => s !== source);
    };
    return bytes.length;
  }

  isPlaying(): boolean {
    return this.active.length > 0 || this.playbackTime > this.ctx.currentTime + 0.005;
  }

  currentLevel(): number {
    this.analyser.getByteFrequencyData(this.freqBuf as unknown as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < this.freqBuf.length; i++) {
      const v = this.freqBuf[i] / 255;
      sum += v * v;
    }
    return Math.min(Math.sqrt(sum / this.freqBuf.length) * 2.2, 1);
  }

  cancel() {
    for (const source of this.active) {
      try {
        source.stop();
      } catch {
        /* already ended */
      }
      source.disconnect();
    }
    this.active = [];
    this.playbackTime = this.ctx.currentTime;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[],
    );
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
