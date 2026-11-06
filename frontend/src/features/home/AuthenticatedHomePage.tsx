import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { logout } from '../../api/auth'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SESSION_QUERY_KEY, useSession } from '../auth/session'

export function AuthenticatedHomePage() {
  const { t } = useTranslation()
  const session = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = session.data

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      navigate('/', { replace: true })
    },
  })

  if (!user) return null

  const displayName = user.display_name || user.email

  return (
    <section className="app-home">
      <div className="app-home__hero">
        <div>
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1>{t('home.greeting', { name: displayName })}</h1>
          <p>{t('home.body')}</p>
        </div>
        <Button
          variant="secondary"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          {logoutMutation.isPending ? t('common.loggingOut') : t('common.logout')}
        </Button>
      </div>

      {logoutMutation.isError && (
        <p className="form-error" role="alert">
          {t('auth.genericError')}
        </p>
      )}

      <div className="foundation-grid">
        <Card className="foundation-card">
          <span className="foundation-card__index">01</span>
          <h2>{t('home.sessionTitle')}</h2>
          <p>{t('home.sessionBody')}</p>
        </Card>
        <Card className="foundation-card">
          <span className="foundation-card__index">02</span>
          <h2>{t('home.nextTitle')}</h2>
          <p>{t('home.nextBody')}</p>
        </Card>
      </div>

      <dl className="account-summary">
        <div>
          <dt>{t('home.userEmail')}</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>{t('home.uiLanguage')}</dt>
          <dd>{user.preferred_ui_language.toUpperCase()}</dd>
        </div>
      </dl>
    </section>
  )
}
