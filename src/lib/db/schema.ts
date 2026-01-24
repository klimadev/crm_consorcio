export type {
  Tenant,
  User,
  Region,
  PDV,
  Customer,
  Product,
  PipelineStage,
  Tag,
  Deal,
  Integration,
  CustomFieldDefinition,
  DashboardWidget
} from '@/types/db';

export interface Session {
  id: string;
  refresh_token: string;
  expires_at: string;
  revoked_at: string | null;
  user_id: string;
  created_at: string;
}

export interface Preference {
  id: string;
  user_id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}
