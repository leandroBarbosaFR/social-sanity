import type {OrganizationRole, OrganizationStatus, TenantContext} from './types'

/**
 * Role → capability matrix. The single place roles are interpreted; everything else asks a
 * question (`can(ctx, 'manageMembers')`). The database enforces the same rules with RLS.
 */
export const CAPABILITIES = {
  manageOrganization: ['owner', 'admin'],
  manageBilling: ['owner'],
  deleteOrganization: ['owner'],
  manageMembers: ['owner', 'admin'],
  manageClients: ['owner', 'admin'],
  manageSocialAccounts: ['owner', 'admin'],
  createContent: ['owner', 'admin', 'editor'],
  editContent: ['owner', 'admin', 'editor'],
  submitForReview: ['owner', 'admin', 'editor'],
  approveContent: ['owner', 'admin', 'reviewer', 'client'],
  requestChanges: ['owner', 'admin', 'reviewer', 'client'],
  scheduleContent: ['owner', 'admin', 'editor'],
  publishContent: ['owner', 'admin', 'editor'],
  viewContent: ['owner', 'admin', 'editor', 'reviewer', 'client'],
  viewTeam: ['owner', 'admin', 'editor', 'reviewer'],
  viewAuditLog: ['owner', 'admin'],
  useAi: ['owner', 'admin', 'editor'],
} as const satisfies Record<string, readonly OrganizationRole[]>

export type Capability = keyof typeof CAPABILITIES

/** Capabilities that change content, connections or the team; only while the organization is active. */
const WRITE_CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>([
  'manageOrganization',
  'manageMembers',
  'manageClients',
  'manageSocialAccounts',
  'createContent',
  'editContent',
  'submitForReview',
  'approveContent',
  'requestChanges',
  'scheduleContent',
  'publishContent',
  'useAi',
])

/** Statuses in which members can still open the workspace (read-only unless active). */
const OPEN_STATUSES: ReadonlySet<OrganizationStatus> = new Set<OrganizationStatus>(['active', 'suspended', 'provisioning', 'failed'])

export function roleHas(role: OrganizationRole, capability: Capability): boolean {
  return (CAPABILITIES[capability] as readonly OrganizationRole[]).includes(role)
}

/**
 * Whether the caller may do `capability` in this organization right now. Suspended, cancelled or
 * not-yet-provisioned organizations are read-only: no content changes, no publishing, no team changes.
 * Billing stays reachable for owners of a suspended organization so they can fix it.
 */
export function can(ctx: Pick<TenantContext, 'organizationRole' | 'organizationStatus'>, capability: Capability): boolean {
  if (!OPEN_STATUSES.has(ctx.organizationStatus)) return false
  if (WRITE_CAPABILITIES.has(capability) && ctx.organizationStatus !== 'active') return false
  return roleHas(ctx.organizationRole, capability)
}

/** Client-level access from the resolved scope (the database applies the same rule in RLS). */
export function canAccessClient(ctx: Pick<TenantContext, 'clientScope'>, clientId: string): boolean {
  return ctx.clientScope === null || ctx.clientScope.includes(clientId)
}

type Ctx = Pick<TenantContext, 'organizationRole' | 'organizationStatus'>
export const canManageOrganization = (ctx: Ctx) => can(ctx, 'manageOrganization')
export const canManageBilling = (ctx: Ctx) => can(ctx, 'manageBilling')
export const canManageMembers = (ctx: Ctx) => can(ctx, 'manageMembers')
export const canManageClients = (ctx: Ctx) => can(ctx, 'manageClients')
export const canManageSocialAccounts = (ctx: Ctx) => can(ctx, 'manageSocialAccounts')
export const canCreateContent = (ctx: Ctx) => can(ctx, 'createContent')
export const canApproveContent = (ctx: Ctx) => can(ctx, 'approveContent')
export const canPublishContent = (ctx: Ctx) => can(ctx, 'publishContent')

/** Roles an inviter may hand out: nobody becomes owner by invitation; admins cannot mint admins. */
export function assignableRoles(inviter: OrganizationRole): OrganizationRole[] {
  if (inviter === 'owner') return ['admin', 'editor', 'reviewer', 'client']
  if (inviter === 'admin') return ['editor', 'reviewer', 'client']
  return []
}
