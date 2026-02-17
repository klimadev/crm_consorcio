import { describe, expect, it } from 'vitest';
import { resolveManagerScope } from '@/lib/auth/rbac';

describe('scope resolution', () => {
  it('returns empty visibility for empty scope set', () => {
    const result = resolveManagerScope([]);
    expect(result).toEqual({ pdvIds: [], teamIds: [] });
  });

  it('deduplicates scopes and ignores invalid rows', () => {
    const result = resolveManagerScope([
      { scopeType: 'PDV', pdvId: 'pdv-1', teamId: null },
      { scopeType: 'PDV', pdvId: 'pdv-1', teamId: null },
      { scopeType: 'TEAM', pdvId: null, teamId: 'team-1' },
      { scopeType: 'TEAM', pdvId: null, teamId: null },
    ]);

    expect(result).toEqual({
      pdvIds: ['pdv-1'],
      teamIds: ['team-1'],
    });
  });
});
