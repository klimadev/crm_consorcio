import type { TourIdentity, TourStorageState } from "@/modules/onboarding/types";

const STORAGE_VERSION = "v1";
const STORAGE_PREFIX = "crm:onboarding";

export function getTourStorageKey(scope: string, identity: TourIdentity) {
  return `${STORAGE_PREFIX}:${STORAGE_VERSION}:${identity.tenantId}:${identity.userId}:${scope}`;
}

export function readTourCompletion(scope: string, identity: TourIdentity): TourStorageState | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(getTourStorageKey(scope, identity)) as TourStorageState | null;
}

export function writeTourCompletion(scope: string, identity: TourIdentity, value: TourStorageState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getTourStorageKey(scope, identity), value);
}

export function clearTourCompletion(scope: string, identity: TourIdentity) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getTourStorageKey(scope, identity));
}
