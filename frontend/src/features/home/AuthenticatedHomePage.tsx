import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { logout } from '../../api/auth'
import { Button } from '../../components/ui/Button'
import { SESSION_QUERY_KEY, useSession } from '../auth/session'
import { PersonalizedFeed } from '../feed/PersonalizedFeed'

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
      queryClient.clear()
      navigate('/', { replace: true })
    },
  })

  if (!user) return null

  const displayName = user.display_name || user.email

  return (
    <section className="app-home">
      <header className="reader-home__header">
        <div className="reader-home__welcome">
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1>{t('home.greeting', { name: displayName })}</h1>
          <p>{t('home.body')}</p>
        </div>

        <div className="reader-home__actions">
          <Link className="button button--secondary" to="/onboarding/interests">
            {t('home.interestsAction')}
          </Link>
          <Button
            variant="ghost"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            {logoutMutation.isPending ? t('common.loggingOut') : t('common.logout')}
          </Button>
        </div>
      </header>

      {logoutMutation.isError && (
        <p className="form-error" role="alert">
          {t('auth.genericError')}
        </p>
      )}

      <PersonalizedFeed />
    </section>
  )
}
