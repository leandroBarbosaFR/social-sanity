import {
  defineAction,
  defineActivity,
  defineField,
  defineStage,
  defineTransition,
  defineWorkflow,
} from '@sanity/workflow-engine/define'

/**
 * Review and approval for one social post, as a Sanity Workflows definition.
 *
 * Workflows owns the human part of the lifecycle (idea → draft → internal/client review → approved).
 * Scheduling and publishing stay with the backend and its revision-locked writes: the post's
 * `workflowStatus` remains the source of truth for `scheduled`, `publishing`, `published` and
 * `failed`, and the stages below only read it.
 *
 * Stage names equal the matching `workflowStatus` values, so mirroring a stage onto the post is an
 * identity mapping (see `statusForStage`).
 */

const status = '$fields.subject.workflowStatus'

/** A stage-scoped routing field: each visit starts empty, and the action that resolves the stage's
 * work records where the post goes next. Transitions read it. */
const next = (targets: readonly string[]) =>
  defineField({type: 'string', name: 'next', options: {list: targets.map((value) => ({title: value, value}))}})

const route = (to: string) => ({type: 'field.set' as const, target: {field: 'next'}, value: {type: 'literal' as const, value: to}})

const goTo = (to: string, title: string) =>
  defineTransition({name: `to-${to}`, title, to, when: `$fields.next == "${to}"`})

/** Once the backend reports the post live, every open stage completes the workflow. */
const toPublished = defineTransition({name: 'to-published', title: 'Published', to: 'published', when: '$isLive'})

const approveOps = [
  {type: 'field.set' as const, target: {field: 'approvedBy'}, value: {type: 'actor' as const}},
  {type: 'field.set' as const, target: {field: 'approvedAt'}, value: {type: 'now' as const}},
]

const clearApproval = [
  {type: 'field.unset' as const, target: {field: 'approvedBy'}},
  {type: 'field.unset' as const, target: {field: 'approvedAt'}},
]

const requestChanges = defineAction({
  name: 'request-changes',
  title: 'Request changes',
  status: 'done',
  params: [{type: 'string', name: 'reason', title: 'What needs to change?'}],
  ops: [route('draft'), {type: 'field.set', target: {field: 'changeRequest'}, value: {type: 'param', param: 'reason'}}],
})

export const postReview = defineWorkflow({
  name: 'social-post-review',
  title: 'Post review',
  description: 'Takes a social post from idea through internal and client review to approval.',
  initialStage: 'intake',
  fields: [
    defineField({
      type: 'subject',
      name: 'subject',
      title: 'Post',
      types: ['socialPost'],
      required: true,
      initialValue: {type: 'input'},
    }),
    defineField({type: 'actor', name: 'approvedBy', title: 'Approved by'}),
    defineField({type: 'datetime', name: 'approvedAt', title: 'Approved at'}),
    defineField({type: 'text', name: 'changeRequest', title: 'Requested changes'}),
  ],
  predicates: {
    isLive: `${status} == "published"`,
  },
  start: {
    requirements: [
      {type: 'singleSubject', name: 'one-open-review', title: 'Review already in progress'},
    ],
  },
  stages: [
    defineStage({
      name: 'intake',
      title: 'Intake',
      description: 'Places the post in the stage matching its current status, so existing posts join mid-way.',
      transitions: [
        toPublished,
        defineTransition({
          name: 'resume-approved',
          to: 'approved',
          when: `${status} in ["approved", "scheduled", "publishing", "failed"]`,
        }),
        defineTransition({name: 'resume-client-review', to: 'clientReview', when: `${status} == "clientReview"`}),
        defineTransition({name: 'resume-internal-review', to: 'internalReview', when: `${status} == "internalReview"`}),
        defineTransition({name: 'resume-draft', to: 'draft', when: `${status} == "draft"`}),
        defineTransition({name: 'resume-idea', to: 'idea', when: 'true'}),
      ],
    }),
    defineStage({
      name: 'idea',
      title: 'Idea',
      fields: [next(['draft'])],
      activities: [
        defineActivity({
          name: 'plan',
          title: 'Shape the idea',
          actions: [defineAction({name: 'start-draft', title: 'Start draft', status: 'done', ops: [route('draft')]})],
        }),
      ],
      transitions: [toPublished, goTo('draft', 'Start draft')],
    }),
    defineStage({
      name: 'draft',
      title: 'Draft',
      fields: [next(['internalReview', 'idea'])],
      activities: [
        defineActivity({
          name: 'write',
          title: 'Write the post',
          actions: [
            defineAction({
              name: 'submit',
              title: 'Submit for review',
              status: 'done',
              ops: [route('internalReview'), {type: 'field.unset', target: {field: 'changeRequest'}}],
            }),
            defineAction({name: 'back-to-ideas', title: 'Move back to ideas', status: 'done', ops: [route('idea')]}),
          ],
        }),
      ],
      transitions: [toPublished, goTo('internalReview', 'Submit for review'), goTo('idea', 'Move back to ideas')],
    }),
    defineStage({
      name: 'internalReview',
      title: 'Internal review',
      fields: [next(['approved', 'clientReview', 'draft'])],
      activities: [
        defineActivity({
          name: 'internal-review',
          title: 'Review internally',
          actions: [
            defineAction({name: 'approve', title: 'Approve', status: 'done', ops: [route('approved'), ...approveOps]}),
            defineAction({name: 'send-to-client', title: 'Send to client review', status: 'done', ops: [route('clientReview')]}),
            requestChanges,
          ],
        }),
      ],
      transitions: [
        toPublished,
        goTo('approved', 'Approve'),
        goTo('clientReview', 'Send to client review'),
        goTo('draft', 'Request changes'),
      ],
    }),
    defineStage({
      name: 'clientReview',
      title: 'Client review',
      fields: [next(['approved', 'internalReview', 'draft'])],
      activities: [
        defineActivity({
          name: 'client-review',
          title: 'Client review',
          actions: [
            defineAction({name: 'approve', title: 'Approve', status: 'done', ops: [route('approved'), ...approveOps]}),
            defineAction({name: 'back-to-internal', title: 'Back to internal review', status: 'done', ops: [route('internalReview')]}),
            requestChanges,
          ],
        }),
      ],
      transitions: [
        toPublished,
        goTo('approved', 'Approve'),
        goTo('internalReview', 'Back to internal review'),
        goTo('draft', 'Request changes'),
      ],
    }),
    defineStage({
      name: 'approved',
      title: 'Approved',
      description: 'Approved content. Scheduling and publishing are handled by the publishing service.',
      fields: [next(['draft'])],
      activities: [
        defineActivity({
          name: 'handoff',
          title: 'Schedule or publish',
          actions: [
            defineAction({
              name: 'reopen',
              title: 'Back to draft',
              // Unschedule first; a post owned by the publishing service is never reopened.
              filter: `!(${status} in ["scheduled", "publishing", "published"])`,
              status: 'done',
              ops: [route('draft'), ...clearApproval],
            }),
          ],
        }),
      ],
      transitions: [toPublished, goTo('draft', 'Back to draft')],
    }),
    defineStage({name: 'published', title: 'Published', description: 'Live on Instagram. Nothing more to do.'}),
  ],
})
