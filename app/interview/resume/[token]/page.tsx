import { Link2Off } from "lucide-react";

import { InterviewRoom } from "@/components/InterviewRoom";
import { Card, CardContent } from "@/components/ui/card";

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

/** Centered white-modernist invalid-link card. */
function InvalidLink() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft">
            <Link2Off aria-hidden className="h-6 w-6 text-danger" />
          </div>
          <h1 className="mt-5 text-[length:var(--text-title)] font-semibold text-fg">
            Ungültiger Link
          </h1>
          <p className="mt-2 max-w-[42ch] text-[length:var(--text-body)] leading-relaxed text-fg-muted">
            Dieser Fortsetzungs-Link ist nicht gültig oder abgelaufen. Bitte fordere
            einen neuen Termin an.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
