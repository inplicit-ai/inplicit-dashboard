import { notFound } from "next/navigation";
import { makeApi } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ReviewLaunch } from "@/components/setup/ReviewLaunch";

/**
 * Review + launch (O-3, doc 03 §8). Condensed 3-row confirmation of the draft
 * catalog, then the launch pad. Launch → campaign dashboard.
 */
export default async function ReviewPage({
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

  return <ReviewLaunch draftId={session.draft_id} draft={session.config} />;
}
