"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AgentOrb } from "@/components/AgentOrb";

interface Props {
  wsUrl: string;
}

type Msg =
  | { id: string; role: "agent"; text: string; streaming: boolean }
  | { id: string; role: "user"; text: string };

type ConnState = "connecting" | "open" | "closed" | "error";
type Stage = "intro" | "live" | "ended";
type LiveView = "voice" | "chat";

interface ServerMessage {
  type: string;
  text?: string;
  is_final?: boolean;
  data?: string;
  sample_rate?: number;
  phase?: string;
  summary?: string;
  message?: string;
}

interface DebugStats {
  ws: ConnState;
  voiceStarting: boolean;
  voiceReady: boolean;
  audioChunksSent: number;
  audioBytesSent: number;
  agentAudioFrames: number;
  agentAudioBytes: number;
  lastEvent: string;
}

const DEFAULT_DEBUG: DebugStats = {
  ws: "connecting",
  voiceStarting: false,
  voiceReady: false,
  audioChunksSent: 0,
  audioBytesSent: 0,
  agentAudioFrames: 0,
  agentAudioBytes: 0,
  lastEvent: "—",
};

const ORB_SIZE = 132;

export function InterviewRoom({ wsUrl }: Props) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBufferQueue | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micWorkletRef = useRef<AudioWorkletNode | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const levelRef = useRef(0);
  const agentStreamingRef = useRef(false);
  const debugRef = useRef<DebugStats>({ ...DEFAULT_DEBUG });
  const debugTickRef = useRef(0);

  const [state, setState] = useState<ConnState>("connecting");
  const [stage, setStage] = useState<Stage>("intro");
  const [liveView, setLiveView] = useState<LiveView>("voice");
  const [voiceStarting, setVoiceStarting] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const voiceReadyRef = useRef(false);
  const voiceStartTimeoutRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [interimUser, setInterimUser] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"open" | "validation">("open");
  const [endedSummary, setEndedSummary] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugVisible, setDebugVisible] = useState(false);
  const [, forceDebugRender] = useState(0);

  // Debug overlay (?debug=1)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(globalThis.location.href);
    if (url.searchParams.get("debug") === "1") setDebugVisible(true);

    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setDebugVisible((v) => !v);
      }
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, []);

  // Establish WebSocket on mount.
  useEffect(() => {
    log("ws: connecting", { wsUrl });
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      log("ws: open");
      bumpDebug({ ws: "open" });
      setState("open");
    };
    ws.onclose = () => {
      log("ws: closed");
      bumpDebug({ ws: "closed" });
      setState("closed");
    };
    ws.onerror = (e) => {
      log("ws: error", e);
      bumpDebug({ ws: "error" });
      setState("error");
    };
    ws.onmessage = (event) => {
      try {
        handleServerMessage(JSON.parse(event.data));
      } catch (err) {
        log("ws: parse error", err);
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

  // Auto-scroll transcript on new content.
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, interimUser, endedSummary]);

  function bumpDebug(patch: Partial<DebugStats>) {
    debugRef.current = { ...debugRef.current, ...patch };
    const now = performance.now();
    if (now - debugTickRef.current > 200) {
      debugTickRef.current = now;
      forceDebugRender((n) => n + 1);
    }
  }

  function log(msg: string, data?: unknown) {
    debugRef.current = { ...debugRef.current, lastEvent: msg };
    console.info(`[interview] ${msg}`, data ?? "");
  }

  function handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case "voice_starting":
        log("server: voice_starting");
        bumpDebug({ voiceStarting: true });
        setVoiceStarting(true);
        break;
      case "voice_ready":
        log("server: voice_ready");
        bumpDebug({ voiceReady: true });
        voiceReadyRef.current = true;
        setVoiceReady(true);
        if (voiceStartTimeoutRef.current !== null) {
          clearTimeout(voiceStartTimeoutRef.current);
          voiceStartTimeoutRef.current = null;
        }
        startRecording().catch((e) => {
          log("recorder: start failed", e);
          setErrorMsg(
            "Mikrofon-Zugriff verweigert. Du kannst das Interview im Textmodus fortsetzen.",
          );
          setLiveView("chat");
        });
        break;
      case "agent_text":
        appendAgentText(msg.text ?? "", msg.is_final ?? false);
        break;
      case "transcript":
        if (msg.is_final && msg.text) {
          appendUserMessage(msg.text);
          setInterimUser("");
        } else if (!msg.is_final) {
          setInterimUser(msg.text ?? "");
        }
        break;
      case "agent_audio":
        if (msg.data) {
          enqueuePcm16(msg.data, msg.sample_rate ?? 24000);
        }
        break;
      case "interrupt":
        audioQueueRef.current?.cancel();
        agentStreamingRef.current = false;
        markAgentInterrupted();
        break;
      case "phase_change":
        if (msg.phase === "validation" || msg.phase === "open") {
          setPhase(msg.phase);
        }
        break;
      case "interview_end":
        log("server: interview_end → closing room");
        setEndedSummary(msg.summary ?? null);
        setStage("ended");
        stopRecording();
        agentStreamingRef.current = false;
        try {
          wsRef.current?.close(1000, "interview_end");
        } catch {
          /* ignore */
        }
        break;
      case "error":
        log("server: error", msg.message);
        setErrorMsg(msg.message ?? "Es ist ein Fehler aufgetreten.");
        break;
    }
  }

  function appendAgentText(token: string, isFinal: boolean) {
    agentStreamingRef.current = !isFinal;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "agent" && last.streaming) {
        if (isFinal && token === "") {
          return [...prev.slice(0, -1), { ...last, streaming: false }];
        }
        return [
          ...prev.slice(0, -1),
          { ...last, text: last.text + token, streaming: !isFinal },
        ];
      }
      if (token === "" && isFinal) return prev;
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          text: token,
          streaming: !isFinal,
        },
      ];
    });
  }

  function getOrbLevel(): number {
    const queue = audioQueueRef.current;
    let target = 0;
    if (queue && queue.isPlaying()) {
      target = queue.currentLevel();
    } else if (agentStreamingRef.current) {
      target = 0.28 + Math.sin(performance.now() * 0.004) * 0.06;
    }
    const prev = levelRef.current;
    const k = target > prev ? 0.35 : 0.08;
    levelRef.current = prev + (target - prev) * k;
    return levelRef.current;
  }

  function markAgentInterrupted() {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "agent" && last.streaming) {
        return [
          ...prev.slice(0, -1),
          { ...last, text: last.text + " …", streaming: false },
        ];
      }
      return prev;
    });
  }

  function appendUserMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text },
    ]);
  }

  function enqueuePcm16(b64: string, sampleRate: number) {
    const ctx = audioCtxRef.current;
    if (!ctx) {
      log("agent_audio: no AudioContext yet — dropping");
      return;
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    if (!audioQueueRef.current) {
      audioQueueRef.current = new AudioBufferQueue(ctx);
    }
    const bytes = audioQueueRef.current.enqueue(b64, sampleRate);
    debugRef.current.agentAudioFrames += 1;
    debugRef.current.agentAudioBytes += bytes;
    bumpDebug({});
  }

  function sendText() {
    if (!draft.trim() || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;
    if (stage === "ended") return;
    const text = draft.trim();
    appendUserMessage(text);
    wsRef.current.send(JSON.stringify({ type: "text_message", text }));
    setDraft("");
  }

  // Voice activation
  async function enterVoice() {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      audioQueueRef.current = new AudioBufferQueue(audioCtxRef.current);

      log("client → mode_switch=voice");
      wsRef.current?.send(JSON.stringify({ type: "mode_switch", mode: "voice" }));
      setStage("live");
      setLiveView("voice");
      setVoiceStarting(false);
      setVoiceReady(false);
      voiceReadyRef.current = false;

      if (voiceStartTimeoutRef.current !== null) {
        clearTimeout(voiceStartTimeoutRef.current);
      }
      voiceStartTimeoutRef.current = setTimeout(() => {
        if (!voiceReadyRef.current) {
          log("watchdog: no voice_ready within 12s");
          setErrorMsg(
            "Server antwortet nicht (kein voice_ready). Backend-Logs prüfen oder zu Chat wechseln.",
          );
        }
      }, 12_000) as unknown as number;
    } catch (e) {
      log("enterVoice failed", e);
      setErrorMsg(
        "Konnte den Sprachmodus nicht starten. Du kannst das Interview im Textmodus fortsetzen.",
      );
      setStage("live");
      setLiveView("chat");
    }
  }

  function fallbackToText() {
    setStage("live");
    setLiveView("chat");
    wsRef.current?.send(JSON.stringify({ type: "mode_switch", mode: "chat" }));
  }

  function switchToChat() {
    log("client → mode_switch=chat (from voice)");
    stopRecording();
    setVoiceReady(false);
    setVoiceStarting(false);
    voiceReadyRef.current = false;
    if (voiceStartTimeoutRef.current !== null) {
      clearTimeout(voiceStartTimeoutRef.current);
      voiceStartTimeoutRef.current = null;
    }
    audioQueueRef.current?.cancel();
    setLiveView("chat");
    wsRef.current?.send(JSON.stringify({ type: "mode_switch", mode: "chat" }));
  }

  async function switchToVoice() {
    setLiveView("voice");
    await enterVoice();
  }

  async function startRecording() {
    log("recorder: requesting mic");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    micStreamRef.current = stream;

    const ctx = audioCtxRef.current;
    if (!ctx) {
      throw new Error("AudioContext not initialised");
    }
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    log("recorder: loading worklet", { contextRate: ctx.sampleRate });
    try {
      await ctx.audioWorklet.addModule("/pcm-worklet.js");
    } catch (e) {
      log("recorder: worklet load failed", e);
      throw e;
    }

    const source = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, "pcm-worklet");

    node.port.onmessage = (ev) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const buffer = ev.data as ArrayBuffer;
      const b64 = bytesToBase64(new Uint8Array(buffer));
      ws.send(JSON.stringify({ type: "audio_chunk", data: b64 }));
      debugRef.current.audioChunksSent += 1;
      debugRef.current.audioBytesSent += buffer.byteLength;
      if (
        debugRef.current.audioChunksSent <= 3 ||
        debugRef.current.audioChunksSent % 20 === 0
      ) {
        log("audio_chunk → server", {
          n: debugRef.current.audioChunksSent,
          bytes: buffer.byteLength,
          format: "pcm16@16k",
        });
      }
      bumpDebug({});
    };

    source.connect(node);

    micSourceRef.current = source;
    micWorkletRef.current = node;
    log("recorder: started (PCM16 @ 16 kHz)");
    setRecording(true);
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

    const source = micSourceRef.current;
    if (source) {
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
    }
    micSourceRef.current = null;

    const stream = micStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    micStreamRef.current = null;

    setRecording(false);
  }

  // Render
  if (stage === "ended") {
    return <EndedView summary={endedSummary} debug={debugVisible ? debugRef.current : null} />;
  }

  if (stage === "intro") {
    return (
      <IntroView
        connState={state}
        onStartVoice={enterVoice}
        onFallbackText={fallbackToText}
        errorMsg={errorMsg}
        getLevel={getOrbLevel}
        debug={debugVisible ? debugRef.current : null}
      />
    );
  }

  return (
    <div className="iv-shell">
      <Header connState={state} phase={phase} />

      <main className={`iv-main iv-main--${liveView}`}>
        <div className="iv-orb-wrap">
          <AgentOrb size={ORB_SIZE} hue={210} getLevel={getOrbLevel} />
        </div>

        {liveView === "voice" ? (
          <VoiceCenter
            voiceStarting={voiceStarting}
            voiceReady={voiceReady}
            recording={recording}
            connOpen={state === "open"}
            onSwitchToChat={switchToChat}
          />
        ) : (
          <ChatView
            messages={messages}
            interimUser={interimUser}
            transcriptRef={transcriptRef}
            draft={draft}
            setDraft={setDraft}
            sendText={sendText}
            connOpen={state === "open"}
            onSwitchToVoice={switchToVoice}
          />
        )}

        {errorMsg && <div className="flash flash--err iv-error">{errorMsg}</div>}
      </main>

      {debugVisible && <DebugOverlay stats={debugRef.current} />}
      <InterviewStyles />
    </div>
  );
}

// ─── Subviews ────────────────────────────────────────────────────────────────

function Header({
  connState,
  phase,
}: {
  connState: ConnState;
  phase: "open" | "validation";
}) {
  return (
    <header className="iv-header">
      <div className="iv-header__inner">
        <a href="/" className="iv-brand" aria-label="Inplicit">
          <img src="/logo.svg" alt="Inplicit" className="iv-brand__logo" />
        </a>
        <div className="iv-status">
          <ConnDot state={connState} />
          <span className="iv-status__label">{stateLabel(connState)}</span>
          {phase === "validation" && (
            <span className="badge badge--gap iv-status__phase">Validierung</span>
          )}
        </div>
      </div>
    </header>
  );
}

function VoiceCenter({
  voiceStarting,
  voiceReady,
  recording,
  connOpen,
  onSwitchToChat,
}: {
  voiceStarting: boolean;
  voiceReady: boolean;
  recording: boolean;
  connOpen: boolean;
  onSwitchToChat: () => void;
}) {
  return (
    <div className="iv-voice-center">
      <span className="iv-voice-status">
        <span
          className={`iv-voice-status__dot ${recording ? "iv-voice-status__dot--live" : ""}`}
        />
        <span>
          {!connOpen
            ? "Verbinde …"
            : !voiceStarting
              ? "Anfrage gesendet — warte auf Server …"
              : !voiceReady
                ? "Server bereitet Spracherkennung vor …"
                : recording
                  ? "Hört zu — sprich frei."
                  : "Mikrofon pausiert."}
        </span>
      </span>
      <button
        type="button"
        onClick={onSwitchToChat}
        className="btn btn--ghost btn--sm iv-switch"
      >
        Zu Chat wechseln
      </button>
    </div>
  );
}

function ChatView({
  messages,
  interimUser,
  transcriptRef,
  draft,
  setDraft,
  sendText,
  connOpen,
  onSwitchToVoice,
}: {
  messages: Msg[];
  interimUser: string;
  transcriptRef: RefObject<HTMLDivElement | null>;
  draft: string;
  setDraft: (s: string) => void;
  sendText: () => void;
  connOpen: boolean;
  onSwitchToVoice: () => void;
}) {
  return (
    <div className="iv-chat">
      <div ref={transcriptRef} className="iv-transcript">
        {messages.length === 0 && (
          <p className="caption iv-transcript__empty">Hier erscheint dein Verlauf.</p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role}>
            {m.role === "agent" ? cleanAgentText(m.text) : m.text}
            {m.role === "agent" && m.streaming && <Cursor />}
          </Bubble>
        ))}
        {interimUser && (
          <div className="iv-bubble-row iv-bubble-row--right">
            <div className="iv-bubble iv-bubble--user iv-bubble--interim">
              {interimUser} <Cursor />
            </div>
          </div>
        )}
      </div>

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
          placeholder="Antworte hier …"
          rows={2}
          disabled={!connOpen}
          className="iv-composer__textarea"
        />
        <div className="iv-composer__actions">
          <button
            type="button"
            onClick={onSwitchToVoice}
            disabled={!connOpen}
            title="Sprachmodus aktivieren"
            className="btn btn--ghost btn--sm iv-mic"
          >
            <MicIcon active={false} />
          </button>
          <button
            type="button"
            onClick={sendText}
            disabled={!connOpen || !draft.trim()}
            className="btn btn--primary btn--sm"
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}

function IntroView({
  connState,
  onStartVoice,
  onFallbackText,
  errorMsg,
  getLevel,
  debug,
}: {
  connState: ConnState;
  onStartVoice: () => void;
  onFallbackText: () => void;
  errorMsg: string | null;
  getLevel: () => number;
  debug: DebugStats | null;
}) {
  const ready = connState === "open";
  return (
    <div className="iv-center">
      <div className="card iv-card">
        <div className="iv-card__orb">
          <AgentOrb size={140} hue={210} getLevel={getLevel} />
        </div>
        <span className="eyebrow">Interview</span>
        <h1 className="headline iv-card__title">Bereit für ein Gespräch?</h1>
        <p className="page-header__meta iv-card__body">
          Du sprichst gleich mit einem KI-Interviewagenten. Das Gespräch dauert etwa 20–30
          Minuten und ist vollständig anonym.
        </p>

        {errorMsg && <div className="flash flash--err iv-card__flash">{errorMsg}</div>}

        <div className="iv-card__actions">
          <button
            type="button"
            onClick={onStartVoice}
            disabled={!ready}
            className="btn btn--primary btn--lg iv-card__cta"
          >
            {ready ? "Mikrofon erlauben & starten" : "Verbindung wird aufgebaut …"}
          </button>
          <button
            type="button"
            onClick={onFallbackText}
            disabled={!ready}
            className="btn btn--link iv-card__alt"
          >
            Lieber tippen
          </button>
        </div>

        <p className="caption iv-card__legal">
          Wir verwenden dein Mikrofon nur während dieses Gesprächs. Audio wird nicht
          gespeichert, nur die Transkription für die anonyme Auswertung.
        </p>
      </div>
      {debug && <DebugOverlay stats={debug} />}
      <InterviewStyles />
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "agent" | "user";
  children: ReactNode;
}) {
  const klass =
    role === "user" ? "iv-bubble iv-bubble--user" : "iv-bubble iv-bubble--agent";
  const rowKlass =
    role === "user" ? "iv-bubble-row iv-bubble-row--right" : "iv-bubble-row";
  return (
    <div className={rowKlass}>
      <div className={klass}>{children}</div>
    </div>
  );
}

function Cursor() {
  return <span className="iv-cursor" />;
}

function ConnDot({ state }: { state: ConnState }) {
  const klass =
    state === "open"
      ? "iv-conndot iv-conndot--ok"
      : state === "connecting"
        ? "iv-conndot iv-conndot--pending"
        : "iv-conndot iv-conndot--err";
  return <span className={klass} />;
}

function stateLabel(state: ConnState) {
  return state === "open"
    ? "Verbunden"
    : state === "connecting"
      ? "Verbindet …"
      : state === "closed"
        ? "Getrennt"
        : "Verbindungsfehler";
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "iv-mic__icon--pulse" : ""}
    >
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

function EndedView({
  summary,
  debug,
}: {
  summary: string | null;
  debug: DebugStats | null;
}) {
  return (
    <div className="iv-center">
      <div className="card iv-card">
        <span className="eyebrow" style={{ color: "var(--color-success)" }}>
          Abgeschlossen
        </span>
        <h1 className="headline iv-card__title">Vielen Dank!</h1>
        <p className="page-header__meta iv-card__body">
          {summary ??
            "Das Interview ist abgeschlossen. Deine Antworten werden anonym ausgewertet. Du kannst dieses Fenster jetzt schließen."}
        </p>
      </div>
      {debug && <DebugOverlay stats={debug} />}
      <InterviewStyles />
    </div>
  );
}

function DebugOverlay({ stats }: { stats: DebugStats }) {
  const sentKb = (stats.audioBytesSent / 1024).toFixed(1);
  const recvKb = (stats.agentAudioBytes / 1024).toFixed(1);
  return (
    <aside className="iv-debug" aria-live="polite">
      <header className="iv-debug__title">DEBUG (Cmd/Ctrl+Shift+D)</header>
      <dl className="iv-debug__list">
        <dt>WebSocket</dt>
        <dd>{stats.ws}</dd>
        <dt>voice_starting</dt>
        <dd>{stats.voiceStarting ? "yes" : "no"}</dd>
        <dt>voice_ready</dt>
        <dd>{stats.voiceReady ? "yes" : "no"}</dd>
        <dt>audio → server</dt>
        <dd>
          {stats.audioChunksSent} chunks · {sentKb} kB
        </dd>
        <dt>audio ← agent</dt>
        <dd>
          {stats.agentAudioFrames} frames · {recvKb} kB
        </dd>
        <dt>last event</dt>
        <dd className="iv-debug__last">{stats.lastEvent}</dd>
      </dl>
    </aside>
  );
}

// ─── Styles (scoped to this island) ──────────────────────────────────────────

function InterviewStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        .iv-shell { height: 100vh; height: 100dvh; overflow: hidden; display: flex; flex-direction: column; background: var(--color-surface); }

        .iv-header { position: sticky; top: 0; z-index: 30; background: var(--color-bg); border-bottom: 1px solid var(--color-border-subtle); }
        .iv-header__inner { max-width: 760px; margin: 0 auto; padding: 0 var(--space-6); height: var(--header-h); display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
        .iv-brand { display: inline-flex; align-items: center; color: var(--color-text-primary); }
        .iv-brand__logo { height: 26px; width: auto; display: block; }
        .iv-status { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--color-text-secondary); }
        .iv-status__label { font-size: var(--text-caption); }
        .iv-status__phase { margin-left: var(--space-2); }

        .iv-conndot { width: 6px; height: 6px; border-radius: var(--radius-full); display: inline-block; }
        .iv-conndot--ok { background: var(--color-success); }
        .iv-conndot--pending { background: var(--color-warning); }
        .iv-conndot--err { background: var(--color-danger); }

        .iv-main { flex: 1; width: 100%; max-width: 760px; margin: 0 auto; padding: var(--space-6) var(--space-6) var(--space-8); display: flex; flex-direction: column; align-items: center; min-height: 0; }

        .iv-orb-wrap { width: ${ORB_SIZE}px; height: ${ORB_SIZE}px; flex: 0 0 ${ORB_SIZE}px; display: flex; align-items: center; justify-content: center; margin-top: var(--space-4); margin-bottom: var(--space-5); overflow: hidden; }

        .iv-main--voice { justify-content: center; }
        .iv-main--voice .iv-orb-wrap { margin-top: clamp(var(--space-6), 8vh, var(--space-12)); margin-bottom: var(--space-6); }

        .iv-voice-center { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); }
        .iv-voice-status { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--text-caption); color: var(--color-text-secondary); }
        .iv-voice-status__dot { width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--color-text-quaternary); }
        .iv-voice-status__dot--live { background: var(--color-success); animation: iv-pulse 1.6s var(--ease-smooth) infinite; }
        @keyframes iv-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.85); } }

        .iv-switch { margin-top: var(--space-1); }

        .iv-chat { display: flex; flex-direction: column; gap: var(--space-4); width: 100%; flex: 1; min-height: 0; }
        .iv-transcript { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-2) 0 var(--space-4); }
        .iv-transcript__empty { margin: var(--space-4) 0; color: var(--color-text-tertiary); text-align: center; }

        .iv-bubble-row { display: flex; justify-content: flex-start; }
        .iv-bubble-row--right { justify-content: flex-end; }

        .iv-bubble { max-width: min(78%, 620px); padding: var(--space-3) var(--space-4); font-size: var(--text-body); line-height: 1.6; white-space: pre-wrap; border-radius: var(--radius-card); }
        .iv-bubble--agent { background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-primary); }
        .iv-bubble--user { background: var(--color-cta-bg); border: 1px solid var(--color-cta-bg); color: var(--color-cta-text); }
        .iv-bubble--interim { background: var(--color-surface-2); border: 1px dashed var(--color-border); color: var(--color-text-secondary); font-style: italic; }

        .iv-cursor { display: inline-block; width: 2px; height: 0.95em; margin-left: 2px; vertical-align: -2px; background: currentColor; opacity: 0.65; animation: iv-blink 1s steps(2) infinite; }
        @keyframes iv-blink { to { opacity: 0; } }

        .iv-error { margin-top: var(--space-3); align-self: stretch; }

        .iv-composer { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-card); padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4); display: flex; align-items: flex-end; gap: var(--space-3); transition: border-color 0.15s var(--ease-smooth); }
        .iv-composer:focus-within { border-color: var(--color-text-primary); }
        .iv-composer__textarea { flex: 1; font-family: var(--font-family); font-size: var(--text-body); line-height: 1.6; color: var(--color-text-primary); background: transparent; border: 0; resize: none; padding: var(--space-2) 0; min-height: 40px; max-height: 160px; }
        .iv-composer__textarea:focus { outline: none; }
        .iv-composer__textarea::placeholder { color: var(--color-text-quaternary); }
        .iv-composer__textarea:disabled { color: var(--color-text-tertiary); cursor: not-allowed; }
        .iv-composer__actions { display: inline-flex; align-items: center; gap: var(--space-2); }

        .iv-mic { width: 36px; padding: 0; }
        .iv-mic__icon--pulse { animation: iv-pulse 1.6s var(--ease-smooth) infinite; }

        .iv-center { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: var(--space-8) var(--space-4); background: var(--color-surface); }
        .iv-card { max-width: 460px; width: 100%; padding: var(--space-10); background: var(--color-bg); text-align: left; }
        .iv-card__orb { display: flex; justify-content: center; margin-bottom: var(--space-6); }
        .iv-card__title { margin-top: var(--space-3); font-size: clamp(1.75rem, 3vw, 2.25rem); }
        .iv-card__body { margin-top: var(--space-3); }
        .iv-card__flash { margin-top: var(--space-6); }
        .iv-card__actions { margin-top: var(--space-8); display: flex; flex-direction: column; gap: var(--space-2); }
        .iv-card__cta { width: 100%; }
        .iv-card__alt { align-self: center; font-size: var(--text-caption); }
        .iv-card__legal { margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border-subtle); line-height: 1.55; }

        .iv-debug { position: fixed; right: var(--space-4); bottom: var(--space-4); z-index: 50; width: 280px; padding: var(--space-3) var(--space-4); background: rgba(10, 10, 10, 0.92); color: #f0f0f0; border-radius: var(--radius-card); font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.5; backdrop-filter: blur(6px); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25); }
        .iv-debug__title { font-weight: 600; letter-spacing: 0.04em; color: #9ee07e; margin-bottom: var(--space-2); }
        .iv-debug__list { display: grid; grid-template-columns: 9rem 1fr; gap: 2px var(--space-3); margin: 0; }
        .iv-debug__list dt { color: #9aa0a6; }
        .iv-debug__list dd { margin: 0; }
        .iv-debug__last { word-break: break-word; color: #ffd479; }

        @media (max-width: 640px) {
          .iv-header__inner, .iv-main { padding-left: var(--space-4); padding-right: var(--space-4); }
          .iv-card { padding: var(--space-8); }
          .iv-bubble { max-width: 88%; }
        }
      `,
      }}
    />
  );
}

// ─── AudioBufferQueue ────────────────────────────────────────────────────────

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

  /** Returns the byte length consumed (for debug counters). */
  enqueue(b64: string, sampleRate: number): number {
    const bytes = base64ToBytes(b64);
    const sampleCount = bytes.length / 2;
    if (sampleCount === 0) return 0;

    const buffer = this.ctx.createBuffer(1, sampleCount, sampleRate);
    const channel = buffer.getChannelData(0);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < sampleCount; i++) {
      channel[i] = view.getInt16(i * 2, true) / 0x8000;
    }

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
    return (
      this.active.length > 0 || this.playbackTime > this.ctx.currentTime + 0.005
    );
  }

  currentLevel(): number {
    this.analyser.getByteFrequencyData(this.freqBuf as unknown as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < this.freqBuf.length; i++) {
      const v = this.freqBuf[i] / 255;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.freqBuf.length);
    return Math.min(rms * 2.2, 1);
  }

  cancel() {
    for (const source of this.active) {
      try {
        source.stop();
      } catch {
        /* node may have already ended */
      }
      source.disconnect();
    }
    this.active = [];
    this.playbackTime = this.ctx.currentTime;
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function cleanAgentText(s: string): string {
  return s.replace(/<\/?spell>/gi, "").replace(/<\/?[a-z]*$/i, "");
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
