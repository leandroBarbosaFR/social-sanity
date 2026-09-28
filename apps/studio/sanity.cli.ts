import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? '',
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  // Hosted admin Studio (https://sanity-social-8btwn23g.sanity.studio). Content Agent resolves its
  // application from this deployed workspace.
  studioHost: 'sanity-social-8btwn23g',
  deployment: {appId: 'ii3es4ty5lgj29uqisagp4i7'},
})
