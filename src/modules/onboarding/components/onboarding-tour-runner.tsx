"use client";

import { Tour } from "@reactour/tour";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OnboardingTooltip } from "@/modules/onboarding/components/onboarding-tooltip";
import type { RunnerProps } from "@/modules/onboarding/types";

export default function OnboardingTourRunner({ bundle, onFinish }: RunnerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [disabledActions, setDisabledActions] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const highlightedCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isOpen || isNavigating) {
      return;
    }

    const currentStep = bundle.steps[stepIndex];
    if (!currentStep) {
      return;
    }

    if (currentStep.selector === "body") {
      return;
    }

    const timer = window.setTimeout(() => {
      const target = document.querySelector(currentStep.selector as string);
      const isVisible =
        target instanceof HTMLElement &&
        target.offsetParent !== null &&
        window.getComputedStyle(target).visibility !== "hidden";

      if (!isVisible && retryCount < 2) {
        setRetryCount((c) => c + 1);
        return;
      }

      if (!isVisible) {
        setIsOpen(false);
        onFinish();
      }
    }, 100);

    return () => window.clearTimeout(timer);
  }, [bundle.steps, isOpen, isNavigating, onFinish, retryCount, stepIndex]);

  const move = useCallback(
    (direction: "next" | "prev") => {
      setIsNavigating(true);

      const nextIndex = direction === "next" ? stepIndex + 1 : stepIndex - 1;

      if (nextIndex < 0) {
        setIsNavigating(false);
        return;
      }

      if (nextIndex >= bundle.steps.length) {
        setIsOpen(false);
        onFinish();
        setIsNavigating(false);
        return;
      }

      setRetryCount(0);
      setStepIndex(nextIndex);

      window.setTimeout(() => setIsNavigating(false), 50);
    },
    [bundle.steps.length, onFinish, stepIndex],
  );

  const skip = useCallback(() => {
    setIsOpen(false);
    onFinish();
  }, [onFinish]);

  const styles = useMemo(
    () => ({
      popover: (base: Record<string, unknown>) => ({
        ...(base as Record<string, unknown>),
        zIndex: 1200,
        backgroundColor: "transparent",
        boxShadow: "none",
        border: "none",
        padding: 0,
        borderRadius: 0,
      }),
      highlightedArea: (base: Record<string, unknown>) => ({
        ...(base as Record<string, unknown>),
        fill: "transparent",
        stroke: "transparent",
        strokeWidth: 0,
        rx: 10,
        ry: 10,
        transition: "all 0.3s ease",
      }),
      maskArea: (base: Record<string, unknown>) => ({
        ...(base as Record<string, unknown>),
        zIndex: 1199,
        fill: "transparent",
        rx: 8,
      }),
      maskWrapper: (base: Record<string, unknown>) => ({
        ...(base as Record<string, unknown>),
        zIndex: 1198,
        color: "rgba(15, 23, 42, 0.56)",
      }),
    }),
    [],
  );

  useEffect(() => {
    highlightedCleanupRef.current?.();
    highlightedCleanupRef.current = null;

    if (!isOpen) {
      return;
    }

    const currentStep = bundle.steps[stepIndex];
    if (!currentStep || currentStep.selector === "body") {
      return;
    }

    const target = document.querySelector(currentStep.selector as string);
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const previous = {
      position: target.style.position,
      zIndex: target.style.zIndex,
      borderRadius: target.style.borderRadius,
      boxShadow: target.style.boxShadow,
      backgroundColor: target.style.backgroundColor,
      filter: target.style.filter,
      transform: target.style.transform,
      outline: target.style.outline,
      transition: target.style.transition,
    };

    if (!previous.position) {
      target.style.position = "relative";
    }
    target.style.zIndex = "1201";
    target.style.borderRadius = "12px";
    target.style.backgroundColor = "rgba(239, 246, 255, 0.95)";
    target.style.filter = "brightness(1.08) saturate(1.1)";
    target.style.transform = "scale(1.015)";
    target.style.boxShadow =
      "0 0 0 3px rgba(191, 219, 254, 0.95), 0 16px 36px -16px rgba(37, 99, 235, 0.75), 0 0 0 8px rgba(59, 130, 246, 0.2)";
    target.style.outline = "none";
    target.style.transition = "box-shadow 0.25s ease, transform 0.25s ease, filter 0.25s ease";

    highlightedCleanupRef.current = () => {
      target.style.position = previous.position;
      target.style.zIndex = previous.zIndex;
      target.style.borderRadius = previous.borderRadius;
      target.style.boxShadow = previous.boxShadow;
      target.style.backgroundColor = previous.backgroundColor;
      target.style.filter = previous.filter;
      target.style.transform = previous.transform;
      target.style.outline = previous.outline;
      target.style.transition = previous.transition;
    };

    return () => {
      highlightedCleanupRef.current?.();
      highlightedCleanupRef.current = null;
    };
  }, [bundle.steps, isOpen, stepIndex]);

  const steps = useMemo(
    () =>
      bundle.steps.map((step) => ({
        ...step,
        content: () => null,
      })),
    [bundle.steps],
  );

  const ContentComponent = useCallback(
    () => {
      const step = bundle.steps[stepIndex];
      if (!step) {
        return null;
      }

      return (
        <OnboardingTooltip
          index={stepIndex}
          isLastStep={stepIndex === bundle.steps.length - 1}
          onNext={() => move("next")}
          onPrev={() => move("prev")}
          onSkip={skip}
          size={bundle.steps.length}
          step={step}
        />
      );
    },
    [bundle.steps, move, skip, stepIndex],
  );

  return (
    <Tour
      ContentComponent={ContentComponent}
      currentStep={stepIndex}
      disableInteraction={({ currentStep }) => !bundle.steps[currentStep]?.stepInteraction}
      disabledActions={disabledActions}
      isOpen={isOpen}
      onClickClose={skip}
      onClickMask={skip}
      onClickHighlighted={(_, clickProps) => {
        if (bundle.steps[clickProps.currentStep]?.stepInteraction) {
          move("next");
        }
      }}
      setCurrentStep={setStepIndex}
      setDisabledActions={setDisabledActions}
      setIsOpen={setIsOpen}
      showBadge={false}
      showCloseButton={false}
      showDots={false}
      showNavigation={false}
      showPrevNextButtons={false}
      steps={steps}
      styles={styles}
    />
  );
}
