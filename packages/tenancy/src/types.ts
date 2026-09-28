/** Mirrors the `organization_role` / `organization_status` enums in the control-plane database. */
export const ORGANIZATION_ROLES = ['owner', 'admin', 'editor', 'reviewer', 'client'] as const
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number]

export const ORGANIZATION_STATUSES = ['provisioning', 'active', 'failed', 'suspended', 'cancelled', 'pending_deletion'] as const
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number]

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  reviewer: 'Reviewer',
  client: 'Client',
}

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return typeof value === 'string' && (ORGANIZATION_ROLES as readonly string[]).includes(value)
}

/**
 * Everything the server knows about the caller inside one organization. Built only by the server's
 * tenant resolver from the authenticated session and the database; never from request input.
 */
export interface TenantContext {
  userId: string
  organizationId: string
  organizationSlug: string
  organizationName: string
  organizationRole: OrganizationRole
  organizationStatus: OrganizationStatus
  plan: string
  /** Null until provisioning has created the tenant's Sanity project. */
  sanityProjectId: string | null
  sanityDataset: string
  /**
   * Client IDs this member is limited to, or null for "every client in the organization".
   * Always a list for the `client` role.
   */
  clientScope: readonly string[] | null
}
