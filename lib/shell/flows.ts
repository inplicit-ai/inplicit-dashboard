/**
 * Declared multi-step flows (02 §4). A flow is a typed list of steps with a
 * route-derived active-step predicate — consistent with the sidebar policy.
 *
 * The same flow definition drives the topbar Stepper AND any "next step" CTA
 * in the work area. i18n: `labelKey` resolves under `flows.<flowId>`.
 *
 * Pure data + a pure matcher. No React.
 */

export interface FlowStep {
  id: string;
  /** i18n key under `flows.<flowId>`. */
  labelKey: string;
  /** True when this step is the active one for the given pathname. */
  matchesStep: (pathname: string) => boolean;
}

export interface Flow {
  id: string;
  /** i18n key under `flows.<flowId>` for the flow name. */
  nameKey: string;
  steps: FlowStep[];
}

const SETUP_FLOW: Flow = {
  id: "setup",
  nameKey: "name",
  steps: [
    {
      id: "build",
      labelKey: "build",
      matchesStep: (p) => p === "/campaigns/new",
    },
    {
      id: "configure",
      labelKey: "configure",
      matchesStep: (p) => /^\/campaigns\/[^/]+\/configure/.test(p),
    },
    {
      id: "review",
      labelKey: "review",
      matchesStep: (p) => /^\/campaigns\/[^/]+\/review/.test(p),
    },
    {
      id: "launch",
      labelKey: "launch",
      matchesStep: (p) => /^\/campaigns\/[^/]+\/launch/.test(p),
    },
  ],
};

const FLOWS: Flow[] = [SETUP_FLOW];

/** Find the flow that owns the current pathname, or null. */
export function matchFlow(pathname: string): Flow | null {
  return FLOWS.find((f) => f.steps.some((s) => s.matchesStep(pathname))) ?? null;
}

/** Index of the active step within a flow for the current pathname, or -1. */
export function activeStepIndex(flow: Flow, pathname: string): number {
  return flow.steps.findIndex((s) => s.matchesStep(pathname));
}
