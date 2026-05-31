import type { ReactNode } from "react";

/**
 * Public interview layout — minimal shell, no sidebar, no auth. The
 * `InterviewRoom` client component renders its own full-height chrome.
 */
export default function InterviewLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
