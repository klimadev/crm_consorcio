import type { StepType } from "@reactour/tour";

export type TourKey = "dashboard-initial";

export type TourStep = StepType & {
  id: string;
  title: string;
  content: string;
};

export type TourBundle = {
  key: TourKey;
  storageScope: string;
  steps: TourStep[];
};

export type TourIdentity = {
  tenantId: string;
  userId: string;
};

export type TourStorageState = "completed";

export type OnboardingContextValue = {
  identity: TourIdentity;
  startTour: (key: TourKey) => void;
  resetTour: (key: TourKey) => void;
  isTourCompleted: (key: TourKey) => boolean;
};

export type RunnerProps = {
  bundle: TourBundle;
  onFinish: () => void;
};

export type TooltipRenderProps = {
  index: number;
  isLastStep: boolean;
  onNext: () => void;
  onSkip: () => void;
  onPrev: () => void;
  step: TourStep;
  size: number;
};
