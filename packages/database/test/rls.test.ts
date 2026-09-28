import {afterAll, beforeAll, describe, expect, test} from 'vitest'

import {addMember, admin, asUser, assignClient, closePool, createClient, createOrganization, createUser} from './db'

/**
 * Row level security, tested against the real migrations on Postgres 17.
 *
 * Agency A: owner, restricted editor (Nike only), reviewer, client reviewer (Nike only), clients
 *           Nike + Restaurant.
 * Agency B: owner, client Hotel.
 */
const ids = {} as Record<
  'orgA' | 'orgB' | 'ownerA' | 'editorA' | 'reviewerA' | 'clientUserA' | 'ownerB' | 'nike' | 'restaurant' | 'hotel' | 'stranger',
  string
>

beforeAll(async () => {
  ids.orgA = await createOrganization('Agency A', 'agency-a', 'projecta1')
  ids.orgB = await createOrganization('Agency B', 'agency-b', 'projectb2')
  ids.ownerA = await createUser('owner@a.test')
  ids.editorA = await createUser('editor@a.test')
  ids.reviewerA = await createUser('reviewer@a.test')
  ids.clientUserA = await createUser('marketing@nike.test')
  ids.ownerB = await createUser('owner@b.test')
  ids.stranger = await createUser('nobody@x.test')
  await addMember(ids.orgA, ids.ownerA, 'owner')
  await addMember(ids.orgA, ids.editorA, 'editor')
  await addMember(ids.orgA, ids.reviewerA, 'reviewer')
  await addMember(ids.orgA, ids.clientUserA, 'client')
  await addMember(ids.orgB, ids.ownerB, 'owner')
  ids.nike = await createClient(ids.orgA, 'Nike')
  ids.restaurant = await createClient(ids.orgA, 'Restaurant')
  ids.hotel = await createClient(ids.orgB, 'Hotel')
  await assignClient(ids.orgA, ids.nike, ids.editorA)
  await assignClient(ids.orgA, ids.nike, ids.clientUserA)
  await admin(`insert into public.subscriptions (organization_id, plan) values ($1, 'growth'), ($2, 'growth')`, [ids.orgA, ids.orgB])
  await admin(`insert into public.audit_logs (organization_id, action) values ($1, 'member.invited'), ($2, 'member.invited')`, [ids.orgA, ids.orgB])
})

afterAll(closePool)

describe('organizations', () => {
  test('a member sees only their own agency', async () => {
    const rows = await asUser(ids.ownerA, (q) => q<{slug: string}>('select slug from public.organizations order by slug'))
    expect(rows.map((row) => row.slug)).toEqual(['agency-a'])
  })

  test('Agency B cannot read Agency A, even by id', async () => {
    const rows = await asUser(ids.ownerB, (q) => q('select id from public.organizations where id = $1', [ids.orgA]))
    expect(rows).toEqual([])
  })

  test('a user without memberships sees nothing', async () => {
    expect(await asUser(ids.stranger, (q) => q('select id from public.organizations'))).toEqual([])
  })

  test('anonymous callers have no access at all', async () => {
    await expect(asUser(null, (q) => q('select id from public.organizations'))).rejects.toThrow(/permission denied/)
  })

  test('customers cannot read the Sanity project id (infrastructure column)', async () => {
    await expect(asUser(ids.ownerA, (q) => q('select sanity_project_id from public.organizations'))).rejects.toThrow(/permission denied/)
  })

  test('customers cannot repoint their organization at another Sanity project', async () => {
    await expect(
      asUser(ids.ownerA, (q) => q(`update public.organizations set sanity_project_id = 'projectb2' where id = $1`, [ids.orgA])),
    ).rejects.toThrow(/permission denied/)
  })

  test('an owner can rename their agency but not another one', async () => {
    const own = await asUser(ids.ownerA, (q) => q(`update public.organizations set name = 'A2' where id = $1 returning id`, [ids.orgA]))
    expect(own).toHaveLength(1)
    const other = await asUser(ids.ownerA, (q) => q(`update public.organizations set name = 'pwned' where id = $1 returning id`, [ids.orgB]))
    expect(other).toEqual([])
  })

  test('an editor cannot rename the agency', async () => {
    const rows = await asUser(ids.editorA, (q) => q(`update public.organizations set name = 'x' where id = $1 returning id`, [ids.orgA]))
    expect(rows).toEqual([])
  })

  test('customers cannot create organizations directly (provisioning is server-side)', async () => {
    await expect(
      asUser(ids.ownerA, (q) => q(`insert into public.organizations (name, slug) values ('Evil', 'evil-co')`)),
    ).rejects.toThrow(/permission denied/)
  })
})

describe('memberships', () => {
  test('cannot grant yourself a membership in another agency', async () => {
    await expect(
      asUser(ids.ownerA, (q) =>
        q(`insert into public.organization_members (organization_id, user_id, role) values ($1, $2, 'owner')`, [ids.orgB, ids.ownerA]),
      ),
    ).rejects.toThrow(/permission denied/)
  })

  test('cannot escalate your own role', async () => {
    await expect(
      asUser(ids.editorA, (q) => q(`update public.organization_members set role = 'owner' where user_id = $1`, [ids.editorA])),
    ).rejects.toThrow(/permission denied/)
  })

  test('agency staff see the team; the other agency does not', async () => {
    const team = await asUser(ids.reviewerA, (q) => q('select user_id from public.organization_members'))
    expect(team).toHaveLength(4)
    const leak = await asUser(ids.ownerB, (q) => q('select user_id from public.organization_members where organization_id = $1', [ids.orgA]))
    expect(leak).toEqual([])
  })

  test('a client user sees only their own membership', async () => {
    const rows = await asUser(ids.clientUserA, (q) => q<{user_id: string}>('select user_id from public.organization_members'))
    expect(rows.map((row) => row.user_id)).toEqual([ids.clientUserA])
  })

  test('a cancelled agency is no longer accessible to its members', async () => {
    const orgC = await createOrganization('Agency C', 'agency-c', 'projectc3')
    const ownerC = await createUser('owner@c.test')
    await addMember(orgC, ownerC, 'owner')
    await admin(`update public.organizations set status = 'cancelled' where id = $1`, [orgC])
    expect(await asUser(ownerC, (q) => q('select id from public.organizations'))).toEqual([])
  })
})

describe('clients', () => {
  test('Agency A cannot read Agency B clients', async () => {
    const rows = await asUser(ids.ownerA, (q) => q('select id from public.clients where id = $1', [ids.hotel]))
    expect(rows).toEqual([])
  })

  test('owners see every client of their agency', async () => {
    const rows = await asUser(ids.ownerA, (q) => q<{name: string}>('select name from public.clients order by name'))
    expect(rows.map((row) => row.name)).toEqual(['Nike', 'Restaurant'])
  })

  test('a restricted editor sees only assigned clients', async () => {
    const rows = await asUser(ids.editorA, (q) => q<{name: string}>('select name from public.clients'))
    expect(rows.map((row) => row.name)).toEqual(['Nike'])
  })

  test('an unrestricted reviewer sees every client', async () => {
    expect(await asUser(ids.reviewerA, (q) => q('select id from public.clients'))).toHaveLength(2)
  })

  test('a client user sees only their assigned client', async () => {
    const rows = await asUser(ids.clientUserA, (q) => q<{name: string}>('select name from public.clients'))
    expect(rows.map((row) => row.name)).toEqual(['Nike'])
  })

  test('cannot create a client inside another agency', async () => {
    await expect(
      asUser(ids.ownerA, (q) => q(`insert into public.clients (organization_id, name, slug) values ($1, 'Spy', 'spy')`, [ids.orgB])),
    ).rejects.toThrow(/row-level security/)
  })

  test('editors cannot create clients', async () => {
    await expect(
      asUser(ids.editorA, (q) => q(`insert into public.clients (organization_id, name, slug) values ($1, 'New', 'new')`, [ids.orgA])),
    ).rejects.toThrow(/row-level security/)
  })

  test('cannot move a client into another agency', async () => {
    await expect(
      asUser(ids.ownerA, (q) => q(`update public.clients set organization_id = $1 where id = $2`, [ids.orgB, ids.nike])),
    ).rejects.toThrow(/row-level security/)
  })

  test('cannot delete another agency’s client', async () => {
    const rows = await asUser(ids.ownerA, (q) => q('delete from public.clients where id = $1 returning id', [ids.hotel]))
    expect(rows).toEqual([])
  })

  test('can_access_client rejects a client of another agency passed with my organization id', async () => {
    const [row] = await asUser(ids.ownerA, (q) => q<{ok: boolean}>('select public.can_access_client($1, $2) as ok', [ids.orgA, ids.hotel]))
    expect(row!.ok).toBe(false)
  })
})

describe('client access grants', () => {
  test('an owner cannot grant access to another agency’s client', async () => {
    await expect(
      asUser(ids.ownerA, (q) =>
        q(`insert into public.client_members (organization_id, client_id, user_id) values ($1, $2, $3)`, [ids.orgA, ids.hotel, ids.editorA]),
      ),
    ).rejects.toThrow(/foreign key|row-level security/)
  })

  test('an owner cannot give a non-member access to a client', async () => {
    await expect(
      asUser(ids.ownerA, (q) =>
        q(`insert into public.client_members (organization_id, client_id, user_id) values ($1, $2, $3)`, [ids.orgA, ids.restaurant, ids.stranger]),
      ),
    ).rejects.toThrow(/row-level security/)
  })

  test('an editor cannot widen their own client access', async () => {
    await expect(
      asUser(ids.editorA, (q) =>
        q(`insert into public.client_members (organization_id, client_id, user_id) values ($1, $2, $3)`, [ids.orgA, ids.restaurant, ids.editorA]),
      ),
    ).rejects.toThrow(/row-level security/)
  })
})

describe('billing, audit and provisioning', () => {
  test('editors and reviewers cannot see billing', async () => {
    expect(await asUser(ids.editorA, (q) => q('select id from public.subscriptions'))).toEqual([])
    expect(await asUser(ids.reviewerA, (q) => q('select id from public.subscriptions'))).toEqual([])
  })

  test('owners see only their own subscription', async () => {
    expect(await asUser(ids.ownerA, (q) => q('select id from public.subscriptions'))).toHaveLength(1)
  })

  test('the audit log is per agency and read-only', async () => {
    expect(await asUser(ids.ownerA, (q) => q('select id from public.audit_logs'))).toHaveLength(1)
    await expect(
      asUser(ids.ownerA, (q) => q(`insert into public.audit_logs (organization_id, action) values ($1, 'member.removed')`, [ids.orgA])),
    ).rejects.toThrow(/permission denied/)
  })

  test('provisioning errors (diagnostics) are never readable by customers', async () => {
    await admin(`insert into public.provisioning_jobs (organization_id, type, status, error) values ($1, 'provision', 'failed', 'raw api error')`, [ids.orgA])
    const rows = await asUser(ids.ownerA, (q) => q<{status: string}>('select status from public.provisioning_jobs'))
    expect(rows.map((row) => row.status)).toEqual(['failed'])
    await expect(asUser(ids.ownerA, (q) => q('select error from public.provisioning_jobs'))).rejects.toThrow(/permission denied/)
  })

  test('platform admins are invisible to tenants', async () => {
    await admin(`insert into public.platform_admins (user_id) values ($1)`, [ids.stranger])
    await expect(asUser(ids.ownerA, (q) => q('select user_id from public.platform_admins'))).rejects.toThrow(/permission denied/)
  })
})

describe('profiles', () => {
  test('a profile is created on signup', async () => {
    const [row] = await admin<{count: string}>('select count(*) from public.profiles where user_id = $1', [ids.ownerA])
    expect(row!.count).toBe('1')
  })

  test('Agency B cannot read Agency A profiles', async () => {
    expect(await asUser(ids.ownerB, (q) => q('select id from public.profiles where user_id = $1', [ids.ownerA]))).toEqual([])
  })

  test('co-members can read each other; nobody edits someone else', async () => {
    expect(await asUser(ids.editorA, (q) => q('select id from public.profiles where user_id = $1', [ids.ownerA]))).toHaveLength(1)
    const rows = await asUser(ids.editorA, (q) => q(`update public.profiles set display_name = 'x' where user_id = $1 returning id`, [ids.ownerA]))
    expect(rows).toEqual([])
  })
})
