export type Role = 'OWNER' | 'MANAGER' | 'COLLABORATOR';

export interface SessionUser {
  userId: string;
  companyId: string;
  membershipId: string;
  role: Role;
  companySlug: string;
  fullName: string;
  email: string;
  name?: string | null;
}

export interface RequestContext {
  userId: string;
  companyId: string;
  membershipId: string;
  role: Role;
}

export interface ManagerScope {
  scopeType: 'PDV' | 'TEAM';
  pdvId: string | null;
  teamId: string | null;
}

export interface LeadVisibilityScope {
  kind: 'all' | 'manager' | 'ownerOnly';
  pdvIds?: string[];
  teamIds?: string[];
  ownerMembershipId?: string;
}
