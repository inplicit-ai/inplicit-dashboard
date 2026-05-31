import { InterviewRoom } from "@/components/InterviewRoom";
import { StatusDisc } from "@/components/ui/status-disc";

const API_BASE = process.env.API_URL ?? "http://localhost:8080";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invalid = !/^[0-9a-f]{64}$/i.test(token);

  if (invalid) {
    return <InvalidLink />;
  }

  // The browser hits this WS directly — convert http(s):// → ws(s):// without
  // proxying through Next, so the audio path stays under 1 hop.
  const wsBase = API_BASE.replace(/^http/, "ws");
  const wsUrl = `${wsBase}/ws/interview/${token}`;

  return <InterviewRoom wsUrl={wsUrl} token={token} apiBase={API_BASE} />;
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
            Dieser Interview-Link ist nicht gültig. Bitte überprüfe die URL aus deiner E-Mail.
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
