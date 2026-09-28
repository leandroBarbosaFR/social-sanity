/**
 * Read-only Content Agent probe: lists the applications the token can see and runs one read-only
 * prompt against the Social Studio workspace. Usage (token from `sanity debug --secrets`, never committed):
 *   SANITY_AUTH_TOKEN=… SANITY_ORGANIZATION_ID=… node apps/web/scripts/content-agent-probe.ts
 */
import {generateText} from 'ai'
import {createContentAgent} from 'content-agent'

const token = process.env.SANITY_AUTH_TOKEN
const organizationId = process.env.SANITY_ORGANIZATION_ID
if (!token || !organizationId) throw new Error('Set SANITY_AUTH_TOKEN and SANITY_ORGANIZATION_ID.')

const agent = createContentAgent({organizationId, token})
const apps = await agent.applications()
console.log('applications:', apps.map((app) => ({key: app.key, name: app.name, resource: app.resource?.id})))
// One-shot prompt() in content-agent 1.3.1 expects JSON, but the API answers with SSE; a thread
// model through the AI SDK parses the stream correctly.
const application = await agent.resolveApplication({config: () => ({projectId: '8btwn23g', dataset: 'production'})}, 'social-studio')
console.log('resolved application key:', application.key)
const {text} = await generateText({
  model: agent.agent(`probe-${Date.now()}`, {
    application: {key: application.key},
    config: {capabilities: {read: true, write: false, features: {webSearch: false}}},
  }),
  prompt: 'How many socialPost documents exist? Answer with one short sentence.',
})
console.log('agent ok:', text.slice(0, 300))
