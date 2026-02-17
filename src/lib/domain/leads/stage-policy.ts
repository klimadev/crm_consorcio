import type { LeadStage } from '@/types';

const allowedTransitions = new Map<LeadStage, LeadStage[]>([
  ['PROSPECTING', ['PROPOSAL', 'CANCELLED']],
  ['PROPOSAL', ['CONSISTENCY_CHECK', 'CANCELLED']],
  ['CONSISTENCY_CHECK', ['ADESÃO', 'CANCELLED']],
  ['ADESÃO', []],
  ['CANCELLED', []],
]);

export function isStageTransitionAllowed(fromStage: LeadStage, toStage: LeadStage): boolean {
  const allowed = allowedTransitions.get(fromStage) ?? [];
  return allowed.includes(toStage);
}
