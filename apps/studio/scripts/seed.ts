/**
 * Seeds a dataset with demo content so the app has something to show.
 *
 *   pnpm --filter @social-studio/studio seed
 *
 * Refuses to run if the dataset already contains an organization. Demo posts in the
 * "published" state are marked with publishing mode `mock`, so they never look like real
 * Instagram posts.
 */
import {randomUUID} from 'node:crypto'
import {deflateSync} from 'node:zlib'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-09-01'})

const CRC_TABLE = Array.from({length: 256}, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buffer) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** A solid-colour PNG with a lighter diagonal band, so demo media is real image data. */
function makePng(width: number, height: number, [r, g, b]: [number, number, number]): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8)
  const row = width * 3 + 1
  const raw = Buffer.alloc(row * height)
  for (let y = 0; y < height; y++) {
    raw[y * row] = 0
    for (let x = 0; x < width; x++) {
      const band = Math.abs(x - y) < width / 6 ? 28 : 0
      const offset = y * row + 1 + x * 3
      raw[offset] = Math.min(255, r + band)
      raw[offset + 1] = Math.min(255, g + band)
      raw[offset + 2] = Math.min(255, b + band)
    }
  }
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const ref = (id: string) => ({_type: 'reference' as const, _ref: id})
const key = () => randomUUID().slice(0, 12)

function at(daysFromNow: number, hour: number, minute = 0): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + daysFromNow)
  date.setUTCHours(hour, minute, 0, 0)
  return date.toISOString()
}

async function main() {
  const existing = await client.fetch<number>('count(*[_type == "organization"])')
  if (existing > 0) {
    console.log('Dataset already has an organization; not seeding.')
    return
  }

  console.log('Uploading demo images…')
  const palette: [number, number, number][] = [
    [46, 64, 87],
    [87, 56, 46],
    [44, 78, 62],
    [72, 52, 90],
    [90, 80, 40],
    [40, 70, 90],
  ]
  const images: string[] = []
  for (const [index, colour] of palette.entries()) {
    const asset = await client.assets.upload('image', makePng(1080, 1080, colour), {
      filename: `demo-${index + 1}.png`,
      contentType: 'image/png',
    })
    images.push(asset._id)
  }
  const image = (index: number, alt: string) => ({
    _key: key(),
    _type: 'socialImage',
    alt,
    asset: ref(images[index % images.length] ?? ''),
  })

  const orgId = randomUUID()
  const clients = {
    bistro: randomUUID(),
    studio: randomUUID(),
    outdoor: randomUUID(),
  }
  const campaigns = {
    autumnMenu: randomUUID(),
    launch: randomUUID(),
    winterGear: randomUUID(),
  }

  const tx = client.transaction()
  tx.create({_id: orgId, _type: 'organization', name: 'Northlight Agency', timezone: 'Europe/London'})

  tx.create({
    _id: clients.bistro,
    _type: 'client',
    name: 'Maison Bistro',
    organization: ref(orgId),
    website: 'https://example.com/maison-bistro',
    industry: 'Hospitality',
    description: 'Neighbourhood French bistro with a seasonal, market-led menu.',
    status: 'active',
  })
  tx.create({
    _id: clients.studio,
    _type: 'client',
    name: 'Atelier Form',
    organization: ref(orgId),
    website: 'https://example.com/atelier-form',
    industry: 'Architecture',
    description: 'Small architecture studio focused on timber and low-carbon housing.',
    status: 'active',
  })
  tx.create({
    _id: clients.outdoor,
    _type: 'client',
    name: 'Ridgeline Outdoor',
    organization: ref(orgId),
    website: 'https://example.com/ridgeline',
    industry: 'Retail',
    description: 'Independent outdoor equipment shop and repair service.',
    status: 'active',
  })

  tx.create({
    _type: 'brandGuidelines',
    client: ref(clients.bistro),
    brandVoice: 'Warm, unpretentious and precise about ingredients. Never salesy.',
    targetAudience: 'Local professionals aged 28–55 who eat out weekly.',
    contentPillars: ['Seasonal produce', 'Behind the pass', 'Suppliers', 'Wine pairings'],
    wordsToUse: ['seasonal', 'market', 'slow-cooked'],
    wordsToAvoid: ['cheap', 'deal', 'foodie'],
    ctaPreferences: ['Book a table', 'See the menu'],
    languages: ['en-GB', 'fr-FR'],
  })

  tx.create({
    _id: campaigns.autumnMenu,
    _type: 'campaign',
    title: 'Autumn menu',
    client: ref(clients.bistro),
    status: 'active',
    startDate: at(-7, 0).slice(0, 10),
    endDate: at(30, 0).slice(0, 10),
    objective: 'Drive weekday bookings for the new autumn menu.',
  })
  tx.create({
    _id: campaigns.launch,
    _type: 'campaign',
    title: 'Timber House launch',
    client: ref(clients.studio),
    status: 'planned',
    startDate: at(3, 0).slice(0, 10),
    endDate: at(24, 0).slice(0, 10),
    objective: 'Announce the completed Timber House project.',
  })
  tx.create({
    _id: campaigns.winterGear,
    _type: 'campaign',
    title: 'Winter gear',
    client: ref(clients.outdoor),
    status: 'active',
    startDate: at(-2, 0).slice(0, 10),
    endDate: at(40, 0).slice(0, 10),
  })

  type SeedPost = {
    title: string
    client: string
    campaign?: string
    format: 'image' | 'carousel' | 'reel' | 'story'
    status: string
    caption?: string
    hashtags?: string[]
    media?: ReturnType<typeof image>[]
    scheduledAt?: string
    extra?: Record<string, unknown>
  }

  const posts: SeedPost[] = [
    {
      title: 'Squash & sage risotto',
      client: clients.bistro,
      campaign: campaigns.autumnMenu,
      format: 'image',
      status: 'scheduled',
      caption: 'Roasted squash, brown butter, crisp sage. On the menu from Thursday.',
      hashtags: ['autumnmenu', 'seasonal'],
      media: [image(1, 'Risotto in a shallow bowl')],
      scheduledAt: at(1, 11),
    },
    {
      title: 'Supplier story: Hollow Farm',
      client: clients.bistro,
      campaign: campaigns.autumnMenu,
      format: 'carousel',
      status: 'clientReview',
      caption: 'Meet the growers behind our autumn vegetables.',
      hashtags: ['suppliers', 'farmtotable'],
      media: [image(2, 'Farm field'), image(3, 'Crates of squash'), image(4, 'Farmer portrait')],
      scheduledAt: at(3, 17, 30),
    },
    {
      title: 'Wine pairing reel',
      client: clients.bistro,
      campaign: campaigns.autumnMenu,
      format: 'reel',
      status: 'draft',
      caption: 'Three wines for the autumn menu, explained in 30 seconds.',
    },
    {
      title: 'Friday service story',
      client: clients.bistro,
      format: 'story',
      status: 'approved',
      media: [image(5, 'Dining room before service')],
      scheduledAt: at(4, 16),
    },
    {
      title: 'Timber House: first look',
      client: clients.studio,
      campaign: campaigns.launch,
      format: 'carousel',
      status: 'internalReview',
      caption: 'Timber House is complete. A low-carbon family home in cross-laminated timber.',
      hashtags: ['architecture', 'timber', 'lowcarbon'],
      media: [image(0, 'Timber House facade'), image(1, 'Living room'), image(2, 'Staircase detail')],
      scheduledAt: at(5, 9),
    },
    {
      title: 'Detail study: joinery',
      client: clients.studio,
      campaign: campaigns.launch,
      format: 'image',
      status: 'idea',
    },
    {
      title: 'Studio process notes',
      client: clients.studio,
      format: 'image',
      status: 'scheduled',
      caption: 'How we test timber junctions before they reach site.',
      hashtags: ['process'],
      media: [image(3, 'Model on a workbench')],
      scheduledAt: at(2, 8, 30),
    },
    {
      title: 'Winter layering guide',
      client: clients.outdoor,
      campaign: campaigns.winterGear,
      format: 'carousel',
      status: 'approved',
      caption: 'Base, mid, shell: how to layer for a cold ridge walk.',
      hashtags: ['hiking', 'layering', 'wintergear'],
      media: [image(4, 'Base layer'), image(5, 'Fleece'), image(0, 'Shell jacket')],
      scheduledAt: at(6, 12),
    },
    {
      title: 'Repair workshop open',
      client: clients.outdoor,
      format: 'image',
      status: 'failed',
      caption: 'Our repair workshop is open Saturdays from 10.',
      media: [image(2, 'Repair bench')],
      scheduledAt: at(-1, 10),
      extra: {
        publishingAttempts: 1,
        publishingError: {
          code: 'token_expired',
          message: 'Demo data: the Instagram access token has expired.',
          retryable: false,
          occurredAt: at(-1, 10, 1),
          providerCode: '190/463',
        },
        publishingHistory: [
          {
            _key: key(),
            _type: 'publishingHistoryEntry',
            attempt: 1,
            trigger: 'schedule',
            startedAt: at(-1, 10),
            finishedAt: at(-1, 10, 1),
            outcome: 'failed',
            errorCode: 'token_expired',
            message: 'Demo data',
            mode: 'mock',
          },
        ],
      },
    },
    {
      title: 'New season boots',
      client: clients.outdoor,
      campaign: campaigns.winterGear,
      format: 'image',
      status: 'published',
      caption: 'New season boots are in.',
      media: [image(1, 'Boots on a rock')],
      scheduledAt: at(-2, 9),
      extra: {
        publishedAt: at(-2, 9, 1),
        publishingAttempts: 1,
        publishing: {lockId: randomUUID(), startedAt: at(-2, 9), attempt: 1, mode: 'mock'},
        publishingHistory: [
          {
            _key: key(),
            _type: 'publishingHistoryEntry',
            attempt: 1,
            trigger: 'schedule',
            startedAt: at(-2, 9),
            finishedAt: at(-2, 9, 1),
            outcome: 'published',
            message: 'Demo data (mock publish)',
            mode: 'mock',
          },
        ],
      },
    },
  ]

  for (const post of posts) {
    tx.create({
      _type: 'socialPost',
      title: post.title,
      client: ref(post.client),
      ...(post.campaign ? {campaign: ref(post.campaign)} : {}),
      platforms: ['instagram'],
      format: post.format,
      workflowStatus: post.status,
      caption: post.caption,
      hashtags: post.hashtags,
      media: post.media ?? [],
      scheduledAt: post.scheduledAt,
      ...post.extra,
    })
  }

  await tx.commit()
  console.log(`Seeded 1 organization, 3 clients, 3 campaigns and ${posts.length} posts.`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
