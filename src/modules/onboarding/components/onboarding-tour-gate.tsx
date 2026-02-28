"use client";

import { useEffect, useRef, useState } from "react";
import OnboardingTourRunner from "@/modules/onboarding/components/onboarding-tour-runner";
import { readTourCompletion, writeTourCompletion } from "@/modules/onboarding/lib/storage";
import type { RunnerProps, TourBundle, TourIdentity } from "@/modules/onboarding/types";

type OnboardingTourGateProps = {
  bundle: TourBundle;
  identity: TourIdentity;
};

export function OnboardingTourGate({ bundle, identity }: OnboardingTourGateProps) {
  const hasInitialized = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [shouldRenderRunner, setShouldRenderRunner] = useState(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    const isCompleted = readTourCompletion(bundle.storageScope, identity) === "completed";
    const timer = window.setTimeout(() => {
      setShouldRenderRunner(!isCompleted);
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [bundle.storageScope, identity]);

  const handleFinish: RunnerProps["onFinish"] = () => {
    writeTourCompletion(bundle.storageScope, identity, "completed");
    setShouldRenderRunner(false);
  };

  if (!isReady || !shouldRenderRunner) {
    return null;
  }

  return <OnboardingTourRunner bundle={bundle} onFinish={handleFinish} />;
}
