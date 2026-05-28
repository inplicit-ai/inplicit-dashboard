import { makeApi } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Launchpad } from "@/components/setup/Launchpad";

/**
 * Campaign creation — prompt launchpad (O-3, doc 03 §1.1). Replaces the static
 * form. The user types a free-form learning goal; we create a setup-agent draft
 * and move to the chat ⟷ catalog split author screen.
 *
 * Example questions are org-grounded: derived from prior campaign goals. On the
 * org's first campaign there are none → the Launchpad shows a neutral hint.
 */
export default async function NewCampaignPage() {
  let suggestions: string[] = [];

  try {
    const cookie = await requestCookie();
    const campaigns = await makeApi(cookie).campaigns.list();
    // Ground suggestions on prior campaign names (goals are not exposed on the
    // list payload). Dedup + cap at 4. Empty for the first campaign.
    suggestions = Array.from(
      new Set(
        campaigns
          .map((c) => c.org_name)
          .filter((n): n is string => Boolean(n && n.trim())),
      ),
    ).slice(0, 4);
  } catch {
    suggestions = [];
  }

  return <Launchpad suggestions={suggestions} />;
}
