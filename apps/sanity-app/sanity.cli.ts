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
  // Deployed to the organization's Sanity Dashboard as "Social Studio".
  deployment: {appId: 'jwft4ymyy5zq3sghcv1grd5s'},
})
