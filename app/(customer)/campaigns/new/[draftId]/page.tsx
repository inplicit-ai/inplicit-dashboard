import { notFound } from "next/navigation";
import { makeApi } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { SplitAuthor } from "@/components/setup/SplitAuthor";

/**
 * Split author screen (O-3, doc 03 §1.2): chat (left) ⟷ catalog (right). Loads
 * the draft + chat history server-side so a refresh restores the exact state,
 * then hands off to the client orchestrator.
 */
export default async function AuthorPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const cookie = await requestCookie();

  let session;
  try {
    session = await makeApi(cookie).setup.getSession(draftId);
  } catch {
    notFound();
  }

  // Company context now lives in the org's single Kontext vault (the backend
  // resolves it automatically) — no per-campaign vault picker to feed anymore.
  return (
    <SplitAuthor
      sessionId={session.session_id}
      initialDraft={session.config}
      initialRevision={session.revision}
      initialMessages={session.messages}
      orgName={session.org_name}
    />
  );
}
