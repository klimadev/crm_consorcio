import { membershipRepository } from '@/lib/db/repositories/membership.repository';
import type { ManagerScope, RequestContext, LeadVisibilityScope } from '@/types/auth';
import type { Lead, LeadStage } from '@/types';
import { AppError } from '@/lib/http/errors';
import type Database from 'better-sqlite3';

export function resolveManagerScope(scopes: ManagerScope[]): { pdvIds: string[]; teamIds: string[] } {
  const pdvSet = new Set<string>();
  const teamSet = new Set<string>();

  for (const scope of scopes) {
    if (scope.scopeType === 'PDV' && scope.pdvId) {
      pdvSet.add(scope.pdvId);
      continue;
    }

    if (scope.scopeType === 'TEAM' && scope.teamId) {
      teamSet.add(scope.teamId);
    }
  }

  return {
    pdvIds: Array.from(pdvSet),
    teamIds: Array.from(teamSet),
  };
}

export function buildLeadVisibilityScope(ctx: RequestContext, managerScopes: ManagerScope[]): LeadVisibilityScope {
  if (ctx.role === 'OWNER') {
    return { kind: 'all' };
  }

  if (ctx.role === 'COLLABORATOR') {
    return {
      kind: 'ownerOnly',
      ownerMembershipId: ctx.membershipId,
    };
  }

  // TODO(rbac): Role-to-scope mapping here can deny ADMIN/MEMBER visibility if they are not explicitly handled.
  const resolved = resolveManagerScope(managerScopes);
  return {
    kind: 'manager',
    pdvIds: resolved.pdvIds,
    teamIds: resolved.teamIds,
  };
}

function isLeadInManagerScope(lead: Lead, scope: LeadVisibilityScope): boolean {
  if (scope.kind !== 'manager') {
    return false;
  }

  const pdvVisible = !!lead.pdvId && (scope.pdvIds ?? []).includes(lead.pdvId);
  const teamVisible = !!lead.teamId && (scope.teamIds ?? []).includes(lead.teamId);
  return pdvVisible || teamVisible;
}

export function assertCanViewLead(ctx: RequestContext, lead: Lead, visibilityScope: LeadVisibilityScope): void {
  if (lead.companyId !== ctx.companyId) {
    throw new AppError('FORBIDDEN', 'Cross-company access denied.', 403);
  }

  if (ctx.role === 'OWNER') {
    return;
  }

  if (ctx.role === 'COLLABORATOR' && lead.ownerMembershipId === ctx.membershipId) {
    return;
  }

  if (ctx.role === 'MANAGER' && isLeadInManagerScope(lead, visibilityScope)) {
    return;
  }

  throw new AppError('FORBIDDEN', 'You are not allowed to view this lead.', 403);
}

export function assertCanCreateLead(ctx: RequestContext, input: { ownerMembershipId?: string }): void {
  if (ctx.role === 'OWNER') {
    return;
  }

  if (ctx.role === 'COLLABORATOR' && input.ownerMembershipId && input.ownerMembershipId !== ctx.membershipId) {
    throw new AppError('FORBIDDEN', 'Collaborator can only create own leads.', 403);
  }

  if (ctx.role === 'COLLABORATOR') {
    return;
  }

  if (ctx.role === 'MANAGER') {
    return;
  }

  // TODO(rbac): Add explicit deny for unhandled roles to avoid allow-by-fallthrough.
}

export function assertCanMoveLeadStage(ctx: RequestContext, lead: Lead, nextStage: LeadStage): void {
  if (ctx.role === 'COLLABORATOR' && nextStage === 'ADESÃO') {
    throw new AppError('FORBIDDEN', 'Collaborator cannot move a lead to ADESÃO.', 403);
  }

  if (nextStage === 'ADESÃO' && lead.consistencyStatus !== 'VALID') {
    throw new AppError('VALIDATION_ERROR', 'Lead must be VALID before ADESÃO.', 422);
  }
}

export function loadVisibilityScope(db: Database.Database, ctx: RequestContext): LeadVisibilityScope {
  if (ctx.role !== 'MANAGER') {
    return buildLeadVisibilityScope(ctx, []);
  }

  const scopes = membershipRepository.listManagerScopes(db, ctx.companyId, ctx.membershipId);
  return buildLeadVisibilityScope(ctx, scopes);
}
