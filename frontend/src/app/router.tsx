import { createBrowserRouter } from 'react-router-dom'

import { AnonymousOnly, RequireAuth } from '../features/auth/RouteGuards'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { AuthenticatedHomePage } from '../features/home/AuthenticatedHomePage'
import { InterestsOnboardingPage } from '../features/onboarding/InterestsOnboardingPage'
import { LandingPage } from '../features/home/LandingPage'
import { NotFoundPage } from '../features/home/NotFoundPage'
import { RootLayout } from '../layouts/RootLayout'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
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
          { path: 'onboarding/interests', element: <InterestsOnboardingPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
