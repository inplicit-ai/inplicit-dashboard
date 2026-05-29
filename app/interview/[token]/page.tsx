import { InterviewRoom } from "@/components/InterviewRoom";

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

/** Server-safe invalid-link state — narrow centered card, token-styled. */
function InvalidLink() {
  return (
    <div className="invalid-shell">
      <div className="card invalid-card">
        <span className="eyebrow text-pain">Fehler</span>
        <h1 className="title invalid-card__title">Ungültiger Link</h1>
        <p className="body-sm invalid-card__body">
          Dieser Interview-Link ist nicht gültig. Bitte überprüfe die URL aus deiner E-Mail.
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
