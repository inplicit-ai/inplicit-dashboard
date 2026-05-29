import { InterviewRoom } from "@/components/InterviewRoom";

const API_BASE = process.env.API_URL ?? "http://localhost:8080";

/**
 * Resume route (O-6, doc 04 §7.3). Entered from the emailed resume link
 * `/interview/resume/{resume_token}`. Connects to the resume WebSocket which
 * validates + consumes the token, flips the interview back to IN_PROGRESS, and
 * continues the conversation (context replay is a marked TODO server-side).
 */
export default async function ResumePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invalid = !/^[0-9a-f]{64}$/i.test(token);

  if (invalid) {
    return <InvalidLink />;
  }

  const wsBase = API_BASE.replace(/^http/, "ws");
  const wsUrl = `${wsBase}/ws/interview/resume/${token}`;

  return <InterviewRoom wsUrl={wsUrl} apiBase={API_BASE} isResume />;
}

/** Server-safe invalid-link state — narrow centered card, token-styled. */
function InvalidLink() {
  return (
    <div className="invalid-shell">
      <div className="card invalid-card">
        <span className="eyebrow text-pain">Fehler</span>
        <h1 className="title invalid-card__title">Ungültiger Link</h1>
        <p className="body-sm invalid-card__body">
          Dieser Fortsetzungs-Link ist nicht gültig oder abgelaufen. Bitte fordere
          einen neuen Termin an.
        </p>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .invalid-shell { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: var(--space-8) var(--space-4); background: var(--color-surface); }
        .invalid-card { max-width: 440px; width: 100%; text-align: left; }
        .invalid-card__title { margin-top: var(--space-3); }
        .invalid-card__body { margin-top: var(--space-3); }
      `,
        }}
      />
    </div>
  );
}
