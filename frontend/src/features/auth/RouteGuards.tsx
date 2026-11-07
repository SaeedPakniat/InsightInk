import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ErrorState, LoadingScreen } from '../../components/ui/Feedback'
import { useSession } from './session'

export function RequireAuth() {
  const session = useSession()
  const location = useLocation()
  const { t } = useTranslation()

  if (session.isPending) return <LoadingScreen />

  if (session.isError) {
    return (
      <ErrorState
        title={t('errors.sessionTitle')}
        body={t('errors.sessionBody')}
        onRetry={() => void session.refetch()}
      />
    )
  }

  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function RequireModerator() {
  const session = useSession()
  const location = useLocation()
  const { t } = useTranslation()

  if (session.isPending) return <LoadingScreen />

  if (session.isError) {
    return (
      <ErrorState
        title={t('errors.sessionTitle')}
        body={t('errors.sessionBody')}
        onRetry={() => void session.refetch()}
      />
    )
  }

  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!session.data.capabilities.can_moderate) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}

export function AnonymousOnly() {
  const session = useSession()
  const { t } = useTranslation()

  if (session.isPending) return <LoadingScreen />

  if (session.isError) {
    return (
      <ErrorState
        title={t('errors.sessionTitle')}
        body={t('errors.sessionBody')}
        onRetry={() => void session.refetch()}
      />
    )
  }

  if (session.data) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}
