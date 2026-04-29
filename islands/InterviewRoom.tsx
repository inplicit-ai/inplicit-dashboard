import { useEffect, useRef, useState } from "preact/hooks";
import AgentOrb from "./AgentOrb.tsx";

interface Props {
  wsUrl: string;
}

type Msg =
  | { id: string; role: "agent"; text: string; streaming: boolean }
  | { id: string; role: "user"; text: string };

type ConnState = "connecting" | "open" | "closed" | "error";
type Stage = "intro" | "live" | "ended";

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

export default function InterviewRoom({ wsUrl }: Props) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBufferQueue | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  // Decay-smoothed level driving the orb. Read by AgentOrb each frame.
  const levelRef = useRef(0);
  // True while the agent is currently streaming text (used to pulse the orb
  // even in chat-only mode where there's no audio analyser).
  const agentStreamingRef = useRef(false);

  const [state, setState] = useState<ConnState>("connecting");
  const [stage, setStage] = useState<Stage>("intro");
  const [voiceActive, setVoiceActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [interimUser, setInterimUser] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"open" | "validation">("open");
  const [endedSummary, setEndedSummary] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Establish WebSocket on mount.
  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => setState("open");
    ws.onclose = () => setState("closed");
    ws.onerror = () => setState("error");
    ws.onmessage = (event) => {
      try {
        handleServerMessage(JSON.parse(event.data));
      } catch {
        /* ignore */
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

  function handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
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
        setEndedSummary(msg.summary ?? null);
        setStage("ended");
        stopRecording();
        break;
      case "error":
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

  // Sample the audio analyser if voice is active; otherwise synthesise a
  // gentle pulse while the agent is streaming text. Stored in a ref so the
  // orb can poll it on every frame without triggering React renders.
  function getOrbLevel(): number {
    const queue = audioQueueRef.current;
    let target = 0;
    if (queue && queue.isPlaying()) {
      target = queue.currentLevel();
    } else if (agentStreamingRef.current) {
      // Subtle breathing motion so the orb still reads as "alive" in chat mode.
      target = 0.28 + Math.sin(performance.now() * 0.004) * 0.06;
    }
    // One-pole smoothing: rise quickly, fall slowly — feels natural for voice.
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
    if (!ctx) return;
    // Browser autoplay policies sometimes suspend the context after the first
    // user gesture. Re-arm it whenever audio arrives.
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    if (!audioQueueRef.current) {
      audioQueueRef.current = new AudioBufferQueue(ctx);
    }
    audioQueueRef.current.enqueue(b64, sampleRate);
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

  // ── Voice activation ──────────────────────────────────────────────────────

  async function startVoice() {
    try {
      if (!audioCtxRef.current) {
        // Don't pin the sample rate — Safari rejects fixed rates and the
        // AudioBuffers we receive carry their own rate (browser resamples).
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      audioQueueRef.current = new AudioBufferQueue(audioCtxRef.current);

      await startRecording();
      setVoiceActive(true);
      setStage("live");
      wsRef.current?.send(
        JSON.stringify({ type: "mode_switch", mode: "voice" }),
      );
    } catch (_e) {
      setErrorMsg(
        "Mikrofon-Zugriff verweigert. Du kannst das Interview im Textmodus fortsetzen.",
      );
      setVoiceActive(false);
      setStage("live");
    }
  }

  function fallbackToText() {
    setStage("live");
    wsRef.current?.send(JSON.stringify({ type: "mode_switch", mode: "chat" }));
  }

  function toggleVoiceMidConversation() {
    if (voiceActive) {
      stopRecording();
      setVoiceActive(false);
      audioQueueRef.current?.cancel();
      wsRef.current?.send(
        JSON.stringify({ type: "mode_switch", mode: "chat" }),
      );
    } else {
      startVoice();
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const recorder = new MediaRecorder(stream, {
      mimeType: pickMimeType(),
      audioBitsPerSecond: 32000,
    });
    recorder.ondataavailable = async (e) => {
      if (e.data.size === 0 || !wsRef.current) return;
      if (wsRef.current.readyState !== WebSocket.OPEN) return;
      const buffer = await e.data.arrayBuffer();
      const b64 = bytesToBase64(new Uint8Array(buffer));
      wsRef.current.send(JSON.stringify({ type: "audio_chunk", data: b64 }));
    };
    recorder.start(250);
    recorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
      rec.stream.getTracks().forEach((t) => t.stop());
    }
    recorderRef.current = null;
    setRecording(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (stage === "ended") {
    return <EndedView summary={endedSummary} />;
  }

  if (stage === "intro") {
    return (
      <IntroView
        connState={state}
        onStartVoice={startVoice}
        onFallbackText={fallbackToText}
        errorMsg={errorMsg}
        getLevel={getOrbLevel}
      />
    );
  }

  return (
    <div class="iv-shell">
      <header class="iv-header">
        <div class="iv-header__inner">
          <span class="iv-brand">
            <span class="iv-brand__dot" />
            <span class="iv-brand__name">Inplicit</span>
          </span>
          <div class="iv-status">
            <ConnDot state={state} />
            <span class="caption">{stateLabel(state)}</span>
            {phase === "validation" && (
              <span class="badge badge--gap iv-status__phase">
                Validierungsphase
              </span>
            )}
          </div>
        </div>
      </header>

      <div class="iv-disclosure">
        <div class="iv-disclosure__inner">
          <span class="eyebrow iv-disclosure__eyebrow">Hinweis</span>
          <span class="iv-disclosure__text">
            Du sprichst mit einem KI-Interviewagenten — keinem Menschen. Das
            Gespräch ist anonym und vertraulich.
          </span>
        </div>
      </div>

      <main class="iv-main">
        <div class={`iv-presence ${voiceActive ? "iv-presence--voice" : ""}`}>
          <AgentOrb
            size={voiceActive ? 128 : 88}
            hue={210}
            getLevel={getOrbLevel}
          />
          <div class="iv-presence__meta">
            <span class="eyebrow">KI-Interviewer</span>
            <span class="iv-presence__label">
              {voiceActive ? "Hört zu — sprich frei." : "Bereit für deine Antwort."}
            </span>
            {voiceActive && (
              <span class="caption iv-presence__hint">
                Der Verlauf wird unten mitgeschrieben.
              </span>
            )}
          </div>
        </div>

        {voiceActive && <VoiceIndicator recording={recording} />}

        <div ref={transcriptRef} class="iv-transcript">
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role}>
              {m.text}
              {m.role === "agent" && m.streaming && <Cursor />}
            </Bubble>
          ))}

          {interimUser && (
            <div class="iv-bubble-row iv-bubble-row--right">
              <div class="iv-bubble iv-bubble--user iv-bubble--interim">
                {interimUser} <Cursor />
              </div>
            </div>
          )}

          {errorMsg && (
            <div class="flash flash--err iv-error">{errorMsg}</div>
          )}
        </div>

        <div class="iv-composer">
          <textarea
            value={draft}
            onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText();
              }
            }}
            placeholder={voiceActive
              ? "Falls du tippen möchtest …"
              : "Antworte hier …"}
            rows={2}
            disabled={state !== "open"}
            class="iv-composer__textarea"
          />
          <div class="iv-composer__actions">
            <button
              type="button"
              onClick={toggleVoiceMidConversation}
              disabled={state !== "open"}
              title={voiceActive ? "Voice deaktivieren" : "Voice aktivieren"}
              class={`btn btn--sm iv-mic ${
                voiceActive ? "iv-mic--active" : "btn--ghost"
              }`}
            >
              <MicIcon active={recording} />
            </button>
            <button
              type="button"
              onClick={sendText}
              disabled={state !== "open" || !draft.trim()}
              class="btn btn--primary btn--sm"
            >
              Senden
            </button>
          </div>
        </div>

        <p class="caption iv-hint">
          {voiceActive
            ? "Sprich frei. Du kannst den Agenten jederzeit unterbrechen."
            : "Drücke Enter zum Senden · Shift+Enter für Zeilenumbruch"}
        </p>
      </main>

      <InterviewStyles />
    </div>
  );
}

// ─── Subviews ────────────────────────────────────────────────────────────────

function IntroView({
  connState,
  onStartVoice,
  onFallbackText,
  errorMsg,
  getLevel,
}: {
  connState: ConnState;
  onStartVoice: () => void;
  onFallbackText: () => void;
  errorMsg: string | null;
  getLevel: () => number;
}) {
  const ready = connState === "open";
  return (
    <div class="iv-center">
      <div class="card iv-card">
        <div class="iv-card__orb">
          <AgentOrb size={140} hue={210} getLevel={getLevel} />
        </div>
        <span class="eyebrow">Interview</span>
        <h1 class="headline iv-card__title">
          Bereit für ein Gespräch?
        </h1>
        <p class="page-header__meta iv-card__body">
          Du sprichst gleich mit einem KI-Interviewagenten. Das Gespräch dauert
          etwa 20–30 Minuten und ist vollständig anonym.
        </p>

        {errorMsg && <div class="flash flash--err iv-card__flash">{errorMsg}</div>}

        <div class="iv-card__actions">
          <button
            type="button"
            onClick={onStartVoice}
            disabled={!ready}
            class="btn btn--primary btn--lg iv-card__cta"
          >
            {ready ? "Mikrofon erlauben & starten" : "Verbindung wird aufgebaut …"}
          </button>
          <button
            type="button"
            onClick={onFallbackText}
            disabled={!ready}
            class="btn btn--link iv-card__alt"
          >
            Lieber tippen
          </button>
        </div>

        <p class="caption iv-card__legal">
          Wir verwenden dein Mikrofon nur während dieses Gesprächs. Audio wird
          nicht gespeichert, nur die Transkription für die anonyme Auswertung.
        </p>
      </div>
      <InterviewStyles />
    </div>
  );
}

function VoiceIndicator({ recording }: { recording: boolean }) {
  return (
    <div class="iv-voice">
      <span
        class={`iv-voice__dot ${recording ? "iv-voice__dot--live" : ""}`}
      />
      <span class="iv-voice__text">
        {recording
          ? "Voice-Modus aktiv — sprich einfach drauflos."
          : "Voice-Modus pausiert."}
      </span>
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "agent" | "user";
  children: preact.ComponentChildren;
}) {
  const klass = role === "user"
    ? "iv-bubble iv-bubble--user"
    : "iv-bubble iv-bubble--agent";
  const rowKlass = role === "user"
    ? "iv-bubble-row iv-bubble-row--right"
    : "iv-bubble-row";
  return (
    <div class={rowKlass}>
      <div class={klass}>{children}</div>
    </div>
  );
}

function Cursor() {
  return <span class="iv-cursor" />;
}

function ConnDot({ state }: { state: ConnState }) {
  const klass = state === "open"
    ? "iv-conndot iv-conndot--ok"
    : state === "connecting"
    ? "iv-conndot iv-conndot--pending"
    : "iv-conndot iv-conndot--err";
  return <span class={klass} />;
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
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={active ? "iv-mic__icon--pulse" : ""}
    >
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

function EndedView({ summary }: { summary: string | null }) {
  return (
    <div class="iv-center">
      <div class="card iv-card">
        <span class="eyebrow" style="color: var(--color-success)">Abgeschlossen</span>
        <h1 class="headline iv-card__title">Vielen Dank!</h1>
        <p class="page-header__meta iv-card__body">
          {summary ??
            "Das Interview ist abgeschlossen. Deine Antworten werden anonym ausgewertet. Du kannst dieses Fenster jetzt schließen."}
        </p>
      </div>
      <InterviewStyles />
    </div>
  );
}

// ─── Styles (scoped to this island) ──────────────────────────────────────────

function InterviewStyles() {
  return (
    <style>
      {`
        .iv-shell {
          /* Lock the shell to viewport height so the transcript scrolls
             inside its own container instead of the whole page scrolling. */
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: var(--color-surface);
        }

        .iv-header {
          position: sticky;
          top: 0;
          z-index: 30;
          background: var(--color-bg);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .iv-header__inner {
          max-width: 760px;
          margin: 0 auto;
          padding: 0 var(--space-6);
          height: var(--header-h);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
        }
        .iv-brand {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--color-text-primary);
        }
        .iv-brand__dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
          background: var(--color-text-primary);
        }
        .iv-brand__name {
          font-size: var(--text-body-sm);
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .iv-status {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
        }
        .iv-status__phase { margin-left: var(--space-2); }

        .iv-conndot {
          width: 6px;
          height: 6px;
          border-radius: var(--radius-full);
          display: inline-block;
        }
        .iv-conndot--ok { background: var(--color-success); }
        .iv-conndot--pending { background: var(--color-warning); }
        .iv-conndot--err { background: var(--color-danger); }

        .iv-disclosure {
          background: var(--color-accent-soft);
          border-bottom: 1px solid var(--color-accent-muted);
        }
        .iv-disclosure__inner {
          max-width: 760px;
          margin: 0 auto;
          padding: var(--space-3) var(--space-6);
          display: flex;
          align-items: baseline;
          gap: var(--space-3);
          flex-wrap: wrap;
          font-size: var(--text-caption);
          color: var(--color-accent-strong);
        }
        .iv-disclosure__eyebrow {
          color: var(--color-accent-strong);
          font-size: 0.6875rem;
        }
        .iv-disclosure__text { line-height: 1.5; }

        .iv-main {
          flex: 1;
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: var(--space-6) var(--space-6) var(--space-8);
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .iv-presence {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-4);
          margin-bottom: var(--space-4);
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          transition: padding 0.25s var(--ease-smooth);
        }
        .iv-presence--voice {
          padding: var(--space-5);
          gap: var(--space-5);
        }
        .iv-presence__meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .iv-presence__label {
          font-size: var(--text-body);
          color: var(--color-text-primary);
          font-weight: 500;
        }
        .iv-presence__hint {
          margin-top: 2px;
        }

        .iv-voice {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          margin-bottom: var(--space-4);
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          font-size: var(--text-caption);
          color: var(--color-text-secondary);
        }
        .iv-voice__dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
          background: var(--color-text-quaternary);
        }
        .iv-voice__dot--live {
          background: var(--color-success);
          animation: iv-pulse 1.6s var(--ease-smooth) infinite;
        }
        @keyframes iv-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.85); }
        }

        .iv-transcript {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-2) 0 var(--space-6);
        }

        .iv-bubble-row {
          display: flex;
          justify-content: flex-start;
        }
        .iv-bubble-row--right { justify-content: flex-end; }

        .iv-bubble {
          max-width: min(78%, 620px);
          padding: var(--space-3) var(--space-4);
          font-size: var(--text-body);
          line-height: 1.6;
          white-space: pre-wrap;
          border-radius: var(--radius-card);
        }
        .iv-bubble--agent {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
        }
        .iv-bubble--user {
          background: var(--color-cta-bg);
          border: 1px solid var(--color-cta-bg);
          color: var(--color-cta-text);
        }
        .iv-bubble--interim {
          background: var(--color-surface-2);
          border: 1px dashed var(--color-border);
          color: var(--color-text-secondary);
          font-style: italic;
        }

        .iv-cursor {
          display: inline-block;
          width: 2px;
          height: 0.95em;
          margin-left: 2px;
          vertical-align: -2px;
          background: currentColor;
          opacity: 0.65;
          animation: iv-blink 1s steps(2) infinite;
        }
        @keyframes iv-blink {
          to { opacity: 0; }
        }

        .iv-error { margin-top: var(--space-2); }

        .iv-composer {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
          display: flex;
          align-items: flex-end;
          gap: var(--space-3);
          transition: border-color 0.15s var(--ease-smooth);
        }
        .iv-composer:focus-within {
          border-color: var(--color-text-primary);
        }
        .iv-composer__textarea {
          flex: 1;
          font-family: var(--font-family);
          font-size: var(--text-body);
          line-height: 1.6;
          color: var(--color-text-primary);
          background: transparent;
          border: 0;
          resize: none;
          padding: var(--space-2) 0;
          min-height: 40px;
          max-height: 160px;
        }
        .iv-composer__textarea:focus { outline: none; }
        .iv-composer__textarea::placeholder { color: var(--color-text-quaternary); }
        .iv-composer__textarea:disabled {
          color: var(--color-text-tertiary);
          cursor: not-allowed;
        }
        .iv-composer__actions {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
        }

        .iv-mic {
          width: 36px;
          padding: 0;
        }
        .iv-mic--active {
          background: var(--color-success);
          border-color: var(--color-success);
          color: #ffffff;
        }
        .iv-mic--active:hover {
          background: #126e34;
          border-color: #126e34;
        }
        .iv-mic__icon--pulse {
          animation: iv-pulse 1.6s var(--ease-smooth) infinite;
        }

        .iv-hint {
          margin-top: var(--space-3);
          text-align: center;
        }

        .iv-center {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-8) var(--space-4);
          background: var(--color-surface);
        }
        .iv-card {
          max-width: 460px;
          width: 100%;
          padding: var(--space-10);
          background: var(--color-bg);
          text-align: left;
        }
        .iv-card__orb {
          display: flex;
          justify-content: center;
          margin-bottom: var(--space-6);
        }
        .iv-card__title {
          margin-top: var(--space-3);
          font-size: clamp(1.75rem, 3vw, 2.25rem);
        }
        .iv-card__body { margin-top: var(--space-3); }
        .iv-card__flash { margin-top: var(--space-6); }
        .iv-card__actions {
          margin-top: var(--space-8);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .iv-card__cta { width: 100%; }
        .iv-card__alt {
          align-self: center;
          font-size: var(--text-caption);
        }
        .iv-card__legal {
          margin-top: var(--space-6);
          padding-top: var(--space-4);
          border-top: 1px solid var(--color-border-subtle);
          line-height: 1.55;
        }

        @media (max-width: 640px) {
          .iv-header__inner,
          .iv-disclosure__inner,
          .iv-main {
            padding-left: var(--space-4);
            padding-right: var(--space-4);
          }
          .iv-card { padding: var(--space-8); }
          .iv-bubble { max-width: 88%; }
        }
      `}
    </style>
  );
}

// ─── AudioBufferQueue ────────────────────────────────────────────────────────

class AudioBufferQueue {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private freqBuf: Uint8Array<ArrayBuffer>;
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
    this.freqBuf = new Uint8Array(
      new ArrayBuffer(this.analyser.frequencyBinCount),
    );
  }

  enqueue(b64: string, sampleRate: number) {
    const bytes = base64ToBytes(b64);
    const sampleCount = bytes.length / 2;
    if (sampleCount === 0) return;

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
  }

  /** True while at least one buffer is still playing or scheduled. */
  isPlaying(): boolean {
    return this.active.length > 0 ||
      this.playbackTime > this.ctx.currentTime + 0.005;
  }

  /** Current RMS level, normalised to roughly 0..1. */
  currentLevel(): number {
    this.analyser.getByteFrequencyData(this.freqBuf);
    let sum = 0;
    for (let i = 0; i < this.freqBuf.length; i++) {
      const v = this.freqBuf[i] / 255;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.freqBuf.length);
    // Boost slightly so quiet speech still moves the orb.
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

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return "audio/webm";
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
