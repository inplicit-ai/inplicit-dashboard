import { InterviewRoom } from "@/components/InterviewRoom";
import { StatusDisc } from "@/components/ui/status-disc";

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

/** Server-safe invalid-link state — quiet instrument plate on the spine. */
function InvalidLink() {
  return (
    <div className="invalid-shell">
      <div className="invalid-plate">
        <span className="invalid-plate__spine" aria-hidden>
          <StatusDisc state="error" size="lg" />
        </span>
        <div className="invalid-plate__body">
          <span className="eyebrow">Fehler</span>
          <h1 className="title invalid-plate__title">Ungültiger Link</h1>
          <p className="body-lg invalid-plate__text">
            Dieser Fortsetzungs-Link ist nicht gültig oder abgelaufen. Bitte fordere
            einen neuen Termin an.
          </p>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .invalid-shell { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: var(--space-8) var(--space-4); background: var(--color-surface); }
        .invalid-plate { display: grid; grid-template-columns: 28px 1fr; align-items: start; gap: var(--space-4); max-width: 480px; width: 100%; }
        .invalid-plate__spine { display: flex; align-items: center; justify-content: center; padding-top: 2px; }
        .invalid-plate__body { display: flex; flex-direction: column; gap: var(--space-2); }
        .invalid-plate__title { letter-spacing: -0.02em; }
        .invalid-plate__text { margin-top: var(--space-2); color: var(--color-text-secondary); }
      `,
        }}
      />
    </div>
  );
}
