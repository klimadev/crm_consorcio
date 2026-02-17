import { describe, expect, it } from 'vitest';
import { isStageTransitionAllowed } from '@/lib/domain/leads/stage-policy';

describe('stage policy', () => {
  it('allows expected transitions', () => {
    expect(isStageTransitionAllowed('PROSPECTING', 'PROPOSAL')).toBe(true);
    expect(isStageTransitionAllowed('PROPOSAL', 'CONSISTENCY_CHECK')).toBe(true);
    expect(isStageTransitionAllowed('CONSISTENCY_CHECK', 'ADESÃO')).toBe(true);
  });

  it('blocks forbidden transitions and terminal exits', () => {
    expect(isStageTransitionAllowed('PROSPECTING', 'ADESÃO')).toBe(false);
    expect(isStageTransitionAllowed('PROPOSAL', 'ADESÃO')).toBe(false);
    expect(isStageTransitionAllowed('ADESÃO', 'PROPOSAL')).toBe(false);
  });
});
