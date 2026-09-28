import {execFileSync} from 'node:child_process'
import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import pg from 'pg'
import type {TestProject} from 'vitest/node'

/**
 * Starts a throwaway Postgres 17 (Docker), applies the Supabase shim and every migration in
 * order, and hands the URL to the tests. Set DATABASE_TEST_URL to use an existing empty database
 * instead (e.g. in CI with a service container).
 */
const ROOT = join(import.meta.dirname, '..')
let container: string | null = null

async function waitForDatabase(url: string): Promise<void> {
  const deadline = Date.now() + 60_000
  for (;;) {
    const client = new pg.Client({connectionString: url})
    try {
      await client.connect()
      await client.query('select 1')
      await client.end()
      return
    } catch (error) {
      await client.end().catch(() => undefined)
      if (Date.now() > deadline) throw error
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
}

export async function setup(project: TestProject): Promise<void> {
  let url = process.env.DATABASE_TEST_URL
  if (!url) {
    try {
      container = execFileSync(
        'docker',
        ['run', '-d', '--rm', '-e', 'POSTGRES_PASSWORD=postgres', '-p', '127.0.0.1::5432', 'postgres:17-alpine'],
        {encoding: 'utf8'},
      ).trim()
    } catch {
      throw new Error('Tenant isolation tests need Docker (or DATABASE_TEST_URL pointing at an empty Postgres 17).')
    }
    const port = execFileSync('docker', ['port', container, '5432/tcp'], {encoding: 'utf8'}).trim().split(':').pop()
    url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`
  }
  await waitForDatabase(url)

  const client = new pg.Client({connectionString: url})
  await client.connect()
  await client.query(readFileSync(join(ROOT, 'test/supabase-shim.sql'), 'utf8'))
  const dir = join(ROOT, 'supabase/migrations')
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()) {
    try {
      await client.query(readFileSync(join(dir, file), 'utf8'))
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`)
    }
  }
  await client.end()
  project.provide('databaseUrl', url)
}

export function teardown(): void {
  if (container) execFileSync('docker', ['rm', '-f', container], {stdio: 'ignore'})
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string
  }
}
