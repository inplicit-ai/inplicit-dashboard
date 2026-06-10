"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

/**
 * Bridge between the setup CONTENT (SplitAuthor) and the setup HEADER
 * (SetupSteps), which live in separate subtrees under the create-flow layout.
 *
 * SplitAuthor owns the draft + its launch-readiness gates, so only it knows
 * whether "Prüfen & starten" should be enabled. It publishes that state here;
 * SetupSteps renders the action in the header row next to "Abbrechen". The
 * publisher clears the slot on unmount, so the header action only shows while
 * the authoring screen is mounted.
 */
export interface SetupHeaderAction {
  /** Navigate to the review/launch screen. */
  onReview: () => void;
  /** True while a launch gate is unmet or a navigation is in flight. */
  blocked: boolean;
  /** The first unmet gate key (under `setup.review.gates.*`), or null. */
  gateReason: string | null;
}

interface SetupActionStore {
  action: SetupHeaderAction | null;
  setAction: (action: SetupHeaderAction | null) => void;
}

const SetupActionContext = createContext<SetupActionStore | null>(null);

export function SetupActionProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<SetupHeaderAction | null>(null);
  return (
    <SetupActionContext.Provider value={{ action, setAction }}>
      {children}
    </SetupActionContext.Provider>
  );
}

/** Header consumer (SetupSteps) — the currently published action, or null. */
export function useSetupHeaderAction(): SetupHeaderAction | null {
  return useContext(SetupActionContext)?.action ?? null;
}

/** Content publisher (SplitAuthor) — a stable setter for the header action. */
export function useSetSetupHeaderAction(): (
  action: SetupHeaderAction | null,
) => void {
  const ctx = useContext(SetupActionContext);
  return ctx?.setAction ?? (() => {});
}
