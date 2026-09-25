import type { RoutineData } from "@/features/data/seed";

export interface AdminAccessGrant {
  canEdit: boolean;
  expiresAt: string;
  grantedAt: string;
  revokedAt?: string;
  updatedAt: string;
  userId: string;
}

export interface AdminAuditEntry {
  action: string;
  actorLabel: string;
  createdAt: string;
  id: string;
  summary: string;
  targetUserId: string;
}

export interface AdminUserSummary {
  canEdit: boolean;
  displayName: string;
  email?: string;
  expiresAt: string;
  lastUpdatedAt?: string;
  reminders: number;
  subjects: number;
  tasks: number;
  userId: string;
}

export interface AdminRoutineDetail {
  data: RoutineData;
  grant: AdminAccessGrant;
  updatedAt: string;
  user: {
    displayName: string;
    email?: string;
    id: string;
  };
}
