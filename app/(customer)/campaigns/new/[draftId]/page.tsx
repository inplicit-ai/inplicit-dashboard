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

  return (
    <SplitAuthor
      sessionId={session.session_id}
      initialDraft={session.config}
      initialRevision={session.revision}
      initialMessages={session.messages}
    />
  );
}
