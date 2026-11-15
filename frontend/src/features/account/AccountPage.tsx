import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  removeCurrentUserAvatar,
  updateCurrentUser,
  uploadCurrentUserAvatar,
} from '../../api/account'
import { firstFieldError } from '../../api/client'
import type { CurrentUser } from '../../api/types'
import { AccountAvatar } from '../../components/ui/AccountAvatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { FormField } from '../../components/ui/FormField'
import { SESSION_QUERY_KEY, useSession } from '../auth/session'

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const SUPPORTED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type FileError = 'tooLarge' | 'unsupported' | null
type SuccessState = 'profileSaved' | 'avatarUploaded' | 'avatarRemoved' | null

function avatarServerErrorKey(error: unknown) {
  const message = firstFieldError(error, 'avatar')
  if (!message) return 'avatarUploadError'
  if (message.includes('5 MiB')) return 'avatarTooLarge'
  if (message.includes('JPEG') || message.includes('PNG') || message.includes('WebP')) {
    return 'avatarUnsupported'
  }
  if (message.includes('valid image')) return 'avatarInvalid'
  return 'avatarUploadError'
}

export function AccountPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const session = useSession()
  const user = session.data
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<FileError>(null)
  const [successState, setSuccessState] = useState<SuccessState>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const updateMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, updatedUser)
      setDisplayName(updatedUser.display_name)
      setSuccessState('profileSaved')
    },
  })

  const uploadMutation = useMutation({
    mutationFn: uploadCurrentUserAvatar,
    onSuccess: ({ avatar_url }) => {
      queryClient.setQueryData<CurrentUser | null>(SESSION_QUERY_KEY, (current) =>
        current ? { ...current, avatar_url } : current,
      )
      setSelectedFile(null)
      setFileError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSuccessState('avatarUploaded')
    },
  })

  const removeMutation = useMutation({
    mutationFn: removeCurrentUserAvatar,
    onSuccess: () => {
      queryClient.setQueryData<CurrentUser | null>(SESSION_QUERY_KEY, (current) =>
        current ? { ...current, avatar_url: null } : current,
      )
      setConfirmRemove(false)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSuccessState('avatarRemoved')
    },
  })

  if (!user) return null

  const avatarBusy = uploadMutation.isPending || removeMutation.isPending
  const displayNameError = firstFieldError(updateMutation.error, 'display_name')
    ? t('account.displayNameInvalid')
    : updateMutation.isError
      ? t('account.profileSaveError')
      : null

  const avatarMutationError = uploadMutation.isError
    ? t('account.' + avatarServerErrorKey(uploadMutation.error))
    : removeMutation.isError
      ? t('account.avatarRemoveError')
      : null

  const fileErrorMessage =
    fileError === 'tooLarge'
      ? t('account.avatarTooLarge')
      : fileError === 'unsupported'
        ? t('account.avatarUnsupported')
        : null

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSuccessState(null)
    setConfirmRemove(false)
    uploadMutation.reset()
    removeMutation.reset()

    if (!file) {
      setSelectedFile(null)
      setFileError(null)
      return
    }

    if (file.size > AVATAR_MAX_BYTES) {
      setSelectedFile(null)
      setFileError('tooLarge')
      event.target.value = ''
      return
    }

    if (file.type && !SUPPORTED_AVATAR_TYPES.has(file.type)) {
      setSelectedFile(null)
      setFileError('unsupported')
      event.target.value = ''
      return
    }

    setFileError(null)
    setSelectedFile(file)
  }

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccessState(null)
    updateMutation.reset()
    updateMutation.mutate({ display_name: displayName })
  }

  const handleAvatarUpload = () => {
    if (!selectedFile) return
    setSuccessState(null)
    uploadMutation.reset()
    removeMutation.reset()
    uploadMutation.mutate(selectedFile)
  }

  return (
    <section className="account-page">
      <header className="account-page__intro">
        <p className="eyebrow">{t('account.eyebrow')}</p>
        <h1>{t('account.title')}</h1>
        <p>{t('account.body')}</p>
      </header>

      <div className="account-page__grid">
        <Card className="account-card account-card--avatar">
          <div className="account-card__heading">
            <div>
              <h2>{t('account.photoTitle')}</h2>
              <p>{t('account.photoBody')}</p>
            </div>
            <AccountAvatar
              avatarUrl={user.avatar_url}
              displayName={user.display_name}
              email={user.email}
              size="large"
            />
          </div>

          <div className="account-upload">
            <label className="field__label" htmlFor="account-avatar-file">
              {t('account.chooseImage')}
            </label>
            <input
              ref={fileInputRef}
              className="account-upload__input"
              id="account-avatar-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby="account-avatar-requirements account-avatar-message"
              disabled={avatarBusy}
              onChange={handleFileChange}
            />
            <p className="field__message" id="account-avatar-requirements">
              {t('account.photoRequirements')}
            </p>
            <div id="account-avatar-message">
              {selectedFile && (
                <p className="account-upload__selection">
                  {t('account.selectedFile', { name: selectedFile.name })}
                </p>
              )}
              {fileErrorMessage && (
                <p className="field__message field__message--error" role="alert">
                  {fileErrorMessage}
                </p>
              )}
              {avatarMutationError && (
                <p className="form-error" role="alert">
                  {avatarMutationError}
                </p>
              )}
            </div>

            <div className="account-card__actions">
              <Button
                type="button"
                disabled={!selectedFile || avatarBusy}
                onClick={handleAvatarUpload}
              >
                {uploadMutation.isPending
                  ? t('account.uploadingPhoto')
                  : user.avatar_url
                    ? t('account.replacePhoto')
                    : t('account.uploadPhoto')}
              </Button>

              {user.avatar_url && !confirmRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={avatarBusy}
                  onClick={() => {
                    setSuccessState(null)
                    removeMutation.reset()
                    setConfirmRemove(true)
                  }}
                >
                  {t('account.removePhoto')}
                </Button>
              )}
            </div>

            {confirmRemove && (
              <div
                className="account-remove-confirmation"
                role="group"
                aria-label={t('account.removeConfirmationTitle')}
              >
                <p>{t('account.removeConfirmationBody')}</p>
                <div className="account-card__actions">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={removeMutation.isPending}
                    onClick={() => setConfirmRemove(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="account-remove-confirmation__confirm"
                    disabled={removeMutation.isPending}
                    onClick={() => {
                      setSuccessState(null)
                      removeMutation.mutate()
                    }}
                  >
                    {removeMutation.isPending
                      ? t('account.removingPhoto')
                      : t('account.confirmRemovePhoto')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="account-card account-card--details">
          <div className="account-card__heading">
            <div>
              <h2>{t('account.detailsTitle')}</h2>
              <p>{t('account.detailsBody')}</p>
            </div>
          </div>

          <form className="account-details-form" onSubmit={handleProfileSubmit} noValidate>
            <FormField
              label={t('account.displayName')}
              maxLength={150}
              value={displayName}
              error={displayNameError}
              disabled={updateMutation.isPending}
              onChange={(event) => {
                setDisplayName(event.target.value)
                setSuccessState(null)
                updateMutation.reset()
              }}
            />

            <div className="field">
              <label className="field__label" htmlFor="account-email">
                {t('account.email')}
              </label>
              <input
                className="field__input account-details-form__readonly"
                id="account-email"
                type="email"
                value={user.email}
                readOnly
                aria-readonly="true"
              />
              <p className="field__message">{t('account.emailReadonly')}</p>
            </div>

            <div className="account-card__actions">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t('account.savingProfile') : t('account.saveProfile')}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="account-card account-card--preferences">
          <div className="account-card__heading">
            <div>
              <h2>{t('account.preferencesTitle')}</h2>
              <p>{t('account.preferencesBody')}</p>
            </div>
          </div>

          <nav className="account-preferences" aria-label={t('account.preferencesNavigation')}>
            <Link className="account-preferences__link" to="/onboarding/interests">
              <span>
                <strong>{t('account.interestsTitle')}</strong>
                <small>{t('account.interestsBody')}</small>
              </span>
              <span className="account-preferences__chevron" aria-hidden="true">
                ›
              </span>
            </Link>
            <Link className="account-preferences__link" to="/onboarding/languages">
              <span>
                <strong>{t('account.contentLanguagesTitle')}</strong>
                <small>{t('account.contentLanguagesBody')}</small>
              </span>
              <span className="account-preferences__chevron" aria-hidden="true">
                ›
              </span>
            </Link>
          </nav>
        </Card>
      </div>

      {successState && (
        <p className="account-page__status" role="status" aria-live="polite">
          {t('account.' + successState)}
        </p>
      )}
    </section>
  )
}
