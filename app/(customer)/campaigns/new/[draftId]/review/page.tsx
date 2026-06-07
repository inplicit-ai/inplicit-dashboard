import { notFound } from "next/navigation";
import { makeApi, type Vault } from "@/lib/api";
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

  // Fetch vaults so the review screen can show the selected context vault by name.
  let vaults: Vault[] = [];
  try {
    vaults = await api.vaults.list();
  } catch {
    vaults = [];
  }

  return (
    <ReviewLaunch draftId={session.draft_id} draft={session.config} vaults={vaults} />
  );
}
