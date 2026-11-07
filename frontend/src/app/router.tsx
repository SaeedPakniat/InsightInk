import { lazy, type ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { AnonymousOnly, RequireAuth, RequireModerator } from '../features/auth/RouteGuards'
import { RootLayout } from '../layouts/RootLayout'

function lazyPage(load: () => Promise<ComponentType>) {
  return lazy(async () => ({ default: await load() }))
}

const LandingPage = lazyPage(() =>
  import('../features/home/LandingPage').then((module) => module.LandingPage),
)
const IdeaDetailPage = lazyPage(() =>
  import('../features/ideas/detail/IdeaDetailPage').then((module) => module.IdeaDetailPage),
)
const SearchPage = lazyPage(() =>
  import('../features/search/SearchPage').then((module) => module.SearchPage),
)
const CreatorProfilePage = lazyPage(() =>
  import('../features/creators/CreatorProfilePage').then((module) => module.CreatorProfilePage),
)
const LoginPage = lazyPage(() =>
  import('../features/auth/LoginPage').then((module) => module.LoginPage),
)
const RegisterPage = lazyPage(() =>
  import('../features/auth/RegisterPage').then((module) => module.RegisterPage),
)
const AuthenticatedHomePage = lazyPage(() =>
  import('../features/home/AuthenticatedHomePage').then((module) => module.AuthenticatedHomePage),
)
const LatestFeedPage = lazyPage(() =>
  import('../features/feed/LatestFeedPage').then((module) => module.LatestFeedPage),
)
const SavedLibraryPage = lazyPage(() =>
  import('../features/library/SavedLibraryPage').then((module) => module.SavedLibraryPage),
)
const InterestsOnboardingPage = lazyPage(() =>
  import('../features/onboarding/InterestsOnboardingPage').then(
    (module) => module.InterestsOnboardingPage,
  ),
)
const ContentLanguagesPage = lazyPage(() =>
  import('../features/onboarding/languages/ContentLanguagesPage').then(
    (module) => module.ContentLanguagesPage,
  ),
)
const ModerationQueuePage = lazyPage(() =>
  import('../features/moderation/ModerationQueuePage').then((module) => module.ModerationQueuePage),
)
const ModerationReportPage = lazyPage(() =>
  import('../features/moderation/ModerationReportPage').then(
    (module) => module.ModerationReportPage,
  ),
)
const NotFoundPage = lazyPage(() =>
  import('../features/home/NotFoundPage').then((module) => module.NotFoundPage),
)

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'ideas/:ideaId', element: <IdeaDetailPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'creators/:creatorId', element: <CreatorProfilePage /> },
      {
        element: <AnonymousOnly />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: 'app', element: <AuthenticatedHomePage /> },
          { path: 'explore', element: <LatestFeedPage /> },
          { path: 'library', element: <SavedLibraryPage /> },
          { path: 'onboarding/interests', element: <InterestsOnboardingPage /> },
          { path: 'onboarding/languages', element: <ContentLanguagesPage /> },
        ],
      },
      {
        element: <RequireModerator />,
        children: [
          { path: 'moderation', element: <ModerationQueuePage /> },
          {
            path: 'moderation/reports/:reportId',
            element: <ModerationReportPage />,
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
