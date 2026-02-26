"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { OnboardingTourGate } from "@/modules/onboarding/components/onboarding-tour-gate";
import { clearTourCompletion, readTourCompletion } from "@/modules/onboarding/lib/storage";
import { buildDashboardInitialBundle } from "@/modules/onboarding/steps";
import type { OnboardingContextValue, TourBundle, TourIdentity, TourKey } from "@/modules/onboarding/types";

const OnboardingTourContext = createContext<OnboardingContextValue | null>(null);

type OnboardingTourProviderProps = {
  children: ReactNode;
  identity: TourIdentity;
};

export function OnboardingTourProvider({ children, identity }: OnboardingTourProviderProps) {
  const [activeTourKey, setActiveTourKey] = useState<TourKey>("dashboard-initial");
  const bundles = useMemo<Record<TourKey, TourBundle>>(
    () => ({
      "dashboard-initial": buildDashboardInitialBundle(identity.perfil),
    }),
    [identity.perfil],
  );
  const activeBundle = bundles[activeTourKey];

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
    [bundles, identity],
  );

  return (
    <OnboardingTourContext.Provider value={contextValue}>
      {children}
      <OnboardingTourGate bundle={activeBundle} identity={identity} />
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
