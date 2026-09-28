import {ActionDisabledError, StartNotAllowedError, type Actor} from '@sanity/workflow-engine'
import {createBench, subjectField} from '@sanity/workflow-engine-test'
import {describe, expect, test} from 'vitest'

import {statusForStage} from './index'
import {postReview} from './postReview'

const T0 = '2026-09-26T09:00:00.000Z'
const editor: Actor = {kind: 'person', id: 'gEditor1', roles: ['editor']}

async function start(workflowStatus: string | undefined = 'idea') {
  const post = {_id: 'post-1', _type: 'socialPost', title: 'Launch teaser', workflowStatus}
  const bench = createBench({now: T0, documents: [post]})
  await bench.deployDefinitions({expectedMinReaderModel: 10, definitions: [postReview]})
  const {instance} = await bench.startInstance({
    definition: 'social-post-review',
    initialFields: [subjectField('post-1', {type: 'socialPost'})],
  })
  const fire = (activity: string, action: string, params?: Record<string, unknown>) =>
    bench.fireAction({instanceId: instance._id, activity, action, params, actor: editor})
  const setStatus = async (status: string) => {
    await bench.client.patch('post-1').set({workflowStatus: status}).commit()
    return bench.tick({instanceId: instance._id})
  }
  return {bench, instance, fire, setStatus}
}

describe('intake', () => {
  test.each([
    ['idea', 'idea'],
    [undefined, 'idea'],
    ['draft', 'draft'],
    ['internalReview', 'internalReview'],
    ['clientReview', 'clientReview'],
    ['approved', 'approved'],
    ['scheduled', 'approved'],
    ['failed', 'approved'],
    ['published', 'published'],
  ])('a post with status %s joins at %s', async (status, stage) => {
    const {instance} = await start(status)
    expect(instance.currentStage).toBe(stage)
  })
})

describe('review loop', () => {
  test('idea → draft → internal review → client review → approved', async () => {
    const {fire} = await start()
    expect((await fire('plan', 'start-draft')).instance.currentStage).toBe('draft')
    expect((await fire('write', 'submit')).instance.currentStage).toBe('internalReview')
    expect((await fire('internal-review', 'send-to-client')).instance.currentStage).toBe('clientReview')
    const {instance} = await fire('client-review', 'approve')
    expect(instance.currentStage).toBe('approved')
    const fields = Object.fromEntries(instance.fields.map((entry) => [entry.name, entry.value]))
    expect(fields.approvedBy).toMatchObject({id: 'gEditor1'})
    expect(fields.approvedAt).toBe(T0)
  })

  test('requested changes return to draft with the reason, and a resubmit clears it', async () => {
    const {fire} = await start('internalReview')
    const {instance} = await fire('internal-review', 'request-changes', {reason: 'Shorter caption'})
    expect(instance.currentStage).toBe('draft')
    expect(instance.fields.find((entry) => entry.name === 'changeRequest')?.value).toBe('Shorter caption')

    const resubmitted = await fire('write', 'submit')
    expect(resubmitted.instance.currentStage).toBe('internalReview')
    expect(resubmitted.instance.fields.find((entry) => entry.name === 'changeRequest')?.value ?? null).toBeNull()
  })

  test('the routing field is per visit, so a second review round starts clean', async () => {
    const {fire} = await start('draft')
    await fire('write', 'submit')
    await fire('internal-review', 'request-changes', {reason: 'Fix typo'})
    const {instance} = await fire('write', 'submit')
    expect(instance.currentStage).toBe('internalReview')
  })
})

describe('approved hand-off', () => {
  test('an approved post can be reopened, which clears the approval', async () => {
    const {fire} = await start('internalReview')
    await fire('internal-review', 'approve')
    const {instance} = await fire('handoff', 'reopen')
    expect(instance.currentStage).toBe('draft')
    expect(instance.fields.find((entry) => entry.name === 'approvedBy')?.value ?? null).toBeNull()
  })

  test('a scheduled post cannot be reopened until it is unscheduled', async () => {
    const {bench, instance, fire, setStatus} = await start('approved')
    await setStatus('scheduled')
    const evaluation = await bench.evaluate({instanceId: instance._id, actor: editor})
    const reopen = evaluation.currentStage.activities.flatMap((activity) => activity.actions).find((a) => a.action.name === 'reopen')
    expect(reopen?.allowed).toBe(false)
    await expect(fire('handoff', 'reopen')).rejects.toBeInstanceOf(ActionDisabledError)

    await setStatus('approved')
    expect((await fire('handoff', 'reopen')).instance.currentStage).toBe('draft')
  })

  test('a failed post can be reopened', async () => {
    const {fire} = await start('failed')
    expect((await fire('handoff', 'reopen')).instance.currentStage).toBe('draft')
  })

  test('the workflow completes once the post is published, from any stage', async () => {
    const approved = await start('approved')
    const done = await approved.setStatus('published')
    expect(done.instance.currentStage).toBe('published')
    expect(done.instance.completedAt).toBeDefined()

    // "Publish now" with explicit confirmation can skip approval.
    const drafting = await start('draft')
    expect((await drafting.setStatus('published')).instance.currentStage).toBe('published')
  })
})

test('only one open review per post', async () => {
  const {bench} = await start()
  await expect(
    bench.startInstance({definition: 'social-post-review', initialFields: [subjectField('post-1', {type: 'socialPost'})]}),
  ).rejects.toBeInstanceOf(StartNotAllowedError)
})

describe('statusForStage', () => {
  test('review stages map one-to-one', () => {
    expect(statusForStage('draft', 'approved')).toBe('draft')
    expect(statusForStage('clientReview', 'internalReview')).toBe('clientReview')
  })

  test('approved never overwrites a publishing-service status', () => {
    expect(statusForStage('approved', 'internalReview')).toBe('approved')
    expect(statusForStage('approved', 'scheduled')).toBeNull()
    expect(statusForStage('approved', 'failed')).toBeNull()
  })

  test('intake and published never write', () => {
    expect(statusForStage('intake', 'idea')).toBeNull()
    expect(statusForStage('published', 'published')).toBeNull()
  })
})
