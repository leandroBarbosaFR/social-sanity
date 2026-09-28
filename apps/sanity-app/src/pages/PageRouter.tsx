import {useRouter} from '../lib/router'
import {CalendarPage} from './CalendarPage'
import {CampaignPage} from './CampaignPage'
import {CampaignsPage} from './CampaignsPage'
import {ClientPage} from './ClientPage'
import {ClientsPage} from './ClientsPage'
import {ContentPage} from './ContentPage'
import {DashboardPage} from './DashboardPage'
import {MediaPage} from './MediaPage'
import {PlannedPage} from './PlannedPage'
import {PostEditorPage} from './PostEditorPage'
import {SettingsPage} from './SettingsPage'

export function PageRouter() {
  const {route} = useRouter()
  switch (route.name) {
    case 'dashboard':
      return <DashboardPage />
    case 'calendar':
      return <CalendarPage view={route.view} date={route.date} />
    case 'content':
      return <ContentPage key={route.status ?? 'all'} initialStatus={route.status} />
    case 'post':
      return <PostEditorPage key={route.id} documentId={route.id} />
    case 'campaigns':
      return <CampaignsPage />
    case 'campaign':
      return <CampaignPage key={route.id} documentId={route.id} />
    case 'clients':
      return <ClientsPage />
    case 'client':
      return <ClientPage key={route.id} documentId={route.id} tab={route.tab} />
    case 'media':
      return <MediaPage />
    case 'analytics':
      return (
        <PlannedPage
          title="Analytics"
          description="Post performance and account insights will use the Instagram Insights API once publishing is established. Nothing is collected yet."
        />
      )
    case 'ai':
      return (
        <PlannedPage
          title="AI Studio"
          description="Caption drafting and idea generation will use each client’s brand guidelines as context. AI features are not enabled in this release."
        />
      )
    case 'settings':
      return <SettingsPage />
    default:
      return null
  }
}
