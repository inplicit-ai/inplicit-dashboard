import { notFound } from "next/navigation";
import { makeApi } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ReviewLaunch } from "@/components/setup/ReviewLaunch";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const cookie = await requestCookie();
  const api = makeApi(cookie);

  let session;
  try {
    session = await api.setup.getSession(draftId);
  } catch {
    notFound();
  }

  // Company context is sourced from the org's single Kontext vault — no
  // per-campaign vault selection to resolve for the review screen.
  return (
    <ReviewLaunch
      draftId={session.draft_id}
      draft={session.config}
      initialRevision={session.revision}
      orgName={session.org_name}
    />
  );
}
