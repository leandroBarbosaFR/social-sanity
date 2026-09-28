import {inject} from 'vitest'
import pg from 'pg'

export type Role = 'owner' | 'admin' | 'editor' | 'reviewer' | 'client'

let pool: pg.Pool | null = null
function getPool(): pg.Pool {
  pool ??= new pg.Pool({connectionString: inject('databaseUrl'), max: 4})
  return pool
}

export async function closePool(): Promise<void> {
  await pool?.end()
  pool = null
}

/** Runs queries as the `postgres` superuser (setup only). */
export async function admin<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await getPool().query(sql, params)).rows as T[]
}

/**
 * Runs `work` exactly as PostgREST would for a signed-in user: role `authenticated`, JWT claims
 * with `sub` = userId, inside a transaction that is always rolled back.
 */
export async function asUser<T>(userId: string | null, work: (query: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('begin')
    await client.query(`set local role ${userId ? 'authenticated' : 'anon'}`)
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(userId ? {sub: userId, role: 'authenticated'} : {role: 'anon'})])
    return await work(async <R,>(sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows as R[])
  } finally {
    await client.query('rollback').catch(() => undefined)
    client.release()
  }
}

export async function createUser(email: string): Promise<string> {
  const [row] = await admin<{id: string}>(`insert into auth.users (email) values ($1) returning id`, [email])
  return row!.id
}

export async function createOrganization(name: string, slug: string, sanityProjectId: string): Promise<string> {
  const [row] = await admin<{id: string}>(
    `insert into public.organizations (name, slug, status, sanity_project_id) values ($1, $2, 'active', $3) returning id`,
    [name, slug, sanityProjectId],
  )
  return row!.id
}

export async function addMember(organizationId: string, userId: string, role: Role): Promise<void> {
  await admin(`insert into public.organization_members (organization_id, user_id, role) values ($1, $2, $3)`, [organizationId, userId, role])
}

export async function createClient(organizationId: string, name: string): Promise<string> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const [row] = await admin<{id: string}>(
    `insert into public.clients (organization_id, name, slug) values ($1, $2, $3) returning id`,
    [organizationId, name, slug],
  )
  return row!.id
}

export async function assignClient(organizationId: string, clientId: string, userId: string): Promise<void> {
  await admin(`insert into public.client_members (organization_id, client_id, user_id) values ($1, $2, $3)`, [organizationId, clientId, userId])
}
