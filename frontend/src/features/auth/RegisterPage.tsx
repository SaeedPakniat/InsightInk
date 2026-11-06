import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { register } from '../../api/auth'
import { firstFieldError } from '../../api/client'
import type { UiLanguage } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { FormField, PasswordField } from '../../components/ui/FormField'
import { SESSION_QUERY_KEY } from './session'

export function RegisterPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user)
      navigate('/onboarding/interests', { replace: true })
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const language: UiLanguage = i18n.language.startsWith('en') ? 'en' : 'fa'

    mutation.mutate({
      email,
      password,
      display_name: displayName.trim() || undefined,
      preferred_ui_language: language,
    })
  }

  const emailError = firstFieldError(mutation.error, 'email')
  const passwordError = firstFieldError(mutation.error, 'password')

  return (
    <section className="auth-page">
      <div className="auth-page__intro">
        <p className="eyebrow">InsightInk</p>
        <h1>{t('auth.registerTitle')}</h1>
        <p>{t('auth.registerBody')}</p>
      </div>

      <Card className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <FormField
            label={t('auth.displayName')}
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <FormField
            label={t('auth.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            error={emailError}
            onChange={(event) => setEmail(event.target.value)}
          />
          <PasswordField
            label={t('auth.password')}
            autoComplete="new-password"
            required
            value={password}
            error={passwordError}
            hint={!passwordError ? t('auth.passwordHint') : undefined}
            onChange={(event) => setPassword(event.target.value)}
            showLabel={t('auth.showPassword')}
            hideLabel={t('auth.hidePassword')}
          />

          {mutation.isError && !emailError && !passwordError && (
            <p className="form-error" role="alert">
              {t('auth.genericError')}
            </p>
          )}

          <Button fullWidth type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t('auth.registering') : t('auth.registerSubmit')}
          </Button>
        </form>

        <p className="auth-card__switch">
          {t('auth.haveAccount')} <Link to="/login">{t('auth.signInInstead')}</Link>
        </p>
        <p className="auth-card__note">{t('auth.languageStoredLocally')}</p>
      </Card>
    </section>
  )
}
