import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../api/client'
import { login } from '../../api/auth'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { FormField, PasswordField } from '../../components/ui/FormField'
import { SESSION_QUERY_KEY } from './session'

type LoginLocationState = {
  from?: string
}

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user)
      const state = location.state as LoginLocationState | null
      navigate(state?.from || '/app', { replace: true })
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate({ email, password })
  }

  const errorMessage =
    mutation.error instanceof ApiError && mutation.error.status === 400
      ? t('auth.invalidCredentials')
      : mutation.isError
        ? t('auth.genericError')
        : null

  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="eyebrow">InsightInk</p>
        <h1>{t('auth.loginTitle')}</h1>
        <p>{t('auth.loginBody')}</p>
      </div>

      <Card className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <FormField
            label={t('auth.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <PasswordField
            label={t('auth.password')}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            showLabel={t('auth.showPassword')}
            hideLabel={t('auth.hidePassword')}
          />

          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          <Button fullWidth type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t('auth.loggingIn') : t('auth.loginSubmit')}
          </Button>
        </form>

        <p className="auth-card__switch">
          {t('auth.noAccount')} <Link to="/register">{t('auth.createAccount')}</Link>
        </p>
      </Card>
    </section>
  )
}
