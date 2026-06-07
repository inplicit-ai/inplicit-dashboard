import { Launchpad } from "@/components/setup/Launchpad";

/**
 * Campaign creation — prompt launchpad (O-3, doc 03 §1.1). The user types a
 * free-form learning goal; we create a setup-agent draft and move to the
 * chat ⟷ catalog split author screen.
 *
 * Suggestions are now fixed research-goal theme cards rendered by the
 * Launchpad itself (WHY-104) — no org-grounded fetch is needed here.
 */
export default function NewCampaignPage() {
  return <Launchpad />;
}
