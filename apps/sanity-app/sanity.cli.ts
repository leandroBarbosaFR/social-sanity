import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    // The organization that owns this app. Set SANITY_APP_ORGANIZATION_ID in apps/sanity-app/.env.
    organizationId: process.env.SANITY_APP_ORGANIZATION_ID ?? '',
    entry: './src/App.tsx',
    title: 'Social Studio',
    icon: './social-studio.svg',
    visibility: 'default',
  },
})
