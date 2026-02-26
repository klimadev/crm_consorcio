const MAX_TARGET_NOT_FOUND_RETRIES = 2;

export type LifecycleResult =
  | { type: "none" }
  | { type: "step"; nextIndex: number; nextRun: boolean }
  | { type: "retry"; retryCount: number }
  | { type: "finish" };

export function resolveLifecycle(params: {
  targetFound: boolean;
  direction: "next" | "prev";
  isClose: boolean;
  isSkip: boolean;
  stepIndex: number;
  stepCount: number;
  retryCount: number;
}): LifecycleResult {
  const { targetFound, direction, isClose, isSkip, stepIndex, stepCount, retryCount } = params;

  if (isClose || isSkip) {
    return { type: "finish" };
  }

  if (!targetFound) {
    if (retryCount < MAX_TARGET_NOT_FOUND_RETRIES) {
      return { type: "retry", retryCount: retryCount + 1 };
    }

    if (stepIndex >= stepCount - 1) {
      return { type: "finish" };
    }

    return { type: "step", nextIndex: stepIndex + 1, nextRun: true };
  }

  const delta = direction === "prev" ? -1 : 1;
  const nextIndex = stepIndex + delta;

  if (nextIndex < 0) {
    return { type: "step", nextIndex: 0, nextRun: true };
  }

  if (nextIndex >= stepCount) {
    return { type: "finish" };
  }

  return { type: "step", nextIndex, nextRun: true };
}
