"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { OnboardingTourGate } from "@/modules/onboarding/components/onboarding-tour-gate";
import { clearTourCompletion, readTourCompletion } from "@/modules/onboarding/lib/storage";
import { dashboardInitialBundle } from "@/modules/onboarding/steps/dashboard-initial.steps";
import type { OnboardingContextValue, TourBundle, TourIdentity, TourKey } from "@/modules/onboarding/types";

const bundles: Record<TourKey, TourBundle> = {
  "dashboard-initial": dashboardInitialBundle,
};

const OnboardingTourContext = createContext<OnboardingContextValue | null>(null);

type OnboardingTourProviderProps = {
  children: ReactNode;
  identity: TourIdentity;
};

export function OnboardingTourProvider({ children, identity }: OnboardingTourProviderProps) {
  const [activeTourKey, setActiveTourKey] = useState<TourKey>("dashboard-initial");

  const contextValue = useMemo<OnboardingContextValue>(
    () => ({
      identity,
      startTour: (key) => {
        setActiveTourKey(key);
      },
      resetTour: (key) => {
        const bundle = bundles[key];
        clearTourCompletion(bundle.storageScope, identity);
      },
      isTourCompleted: (key) => {
        const bundle = bundles[key];
        return readTourCompletion(bundle.storageScope, identity) === "completed";
      },
    }),
    [identity],
  );

  return (
    <OnboardingTourContext.Provider value={contextValue}>
      {children}
      <OnboardingTourGate bundle={bundles[activeTourKey]} identity={identity} />
    </OnboardingTourContext.Provider>
  );
}

export function useOnboardingTour() {
  const context = useContext(OnboardingTourContext);

  if (!context) {
    throw new Error("useOnboardingTour deve ser usado dentro de OnboardingTourProvider");
  }

  return context;
}
