import { createBrowserRouter } from 'react-router-dom'

import { AnonymousOnly, RequireAuth } from '../features/auth/RouteGuards'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { AuthenticatedHomePage } from '../features/home/AuthenticatedHomePage'
import { InterestsOnboardingPage } from '../features/onboarding/InterestsOnboardingPage'
import { ContentLanguagesPage } from '../features/onboarding/languages/ContentLanguagesPage'
import { LatestFeedPage } from '../features/feed/LatestFeedPage'
import { LandingPage } from '../features/home/LandingPage'
import { IdeaDetailPage } from '../features/ideas/detail/IdeaDetailPage'
import { NotFoundPage } from '../features/home/NotFoundPage'
import { RootLayout } from '../layouts/RootLayout'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'ideas/:ideaId', element: <IdeaDetailPage /> },
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
          { path: 'onboarding/interests', element: <InterestsOnboardingPage /> },
          { path: 'onboarding/languages', element: <ContentLanguagesPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
