import { Handlers, PageProps } from "$fresh/server.ts";
import { asset } from "$fresh/runtime.ts";
import InterviewRoom from "../../islands/InterviewRoom.tsx";

const API_BASE = Deno.env.get("API_URL") ?? "http://localhost:8080";

interface Data {
  token: string;
  wsUrl: string;
  invalid: boolean;
}

export const handler: Handlers<Data> = {
  GET(_req, ctx) {
    const token = ctx.params.token;
    const invalid = !/^[0-9a-f]{64}$/i.test(token);
    const wsBase = API_BASE.replace(/^http/, "ws");
    const wsUrl = `${wsBase}/ws/interview/${token}`;
    return ctx.render({ token, wsUrl, invalid });
  },
};

export default function InterviewPage({ data }: PageProps<Data>) {
  return (
    <html lang="de" data-theme="light">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Interview — Inplicit</title>
        <link rel="icon" type="image/svg+xml" href={asset("/logo_icon.svg")} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href={asset("/design.css")} />
        <style>{`
          html, body { background: var(--color-surface); }
          body { min-height: 100vh; }
        `}</style>
      </head>
      <body>
        {data.invalid
          ? <InvalidLink />
          : <InterviewRoom wsUrl={data.wsUrl} />}
      </body>
    </html>
  );
}

function InvalidLink() {
  return (
    <div class="invalid-shell">
      <div class="card invalid-card">
        <span class="eyebrow" style="color: var(--color-pain)">Fehler</span>
        <h1 class="title invalid-card__title">Ungültiger Link</h1>
        <p class="body-sm invalid-card__body">
          Dieser Interview-Link ist nicht gültig. Bitte überprüfe die URL aus deiner E-Mail.
        </p>
      </div>
      <style>{`
        .invalid-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-8) var(--space-4);
        }
        .invalid-card {
          max-width: 440px;
          width: 100%;
          text-align: left;
        }
        .invalid-card__title { margin-top: var(--space-2); }
        .invalid-card__body { margin-top: var(--space-3); }
      `}</style>
    </div>
  );
}
