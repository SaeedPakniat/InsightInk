import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { firstFieldError } from '../../api/client'
import { createMyCreatorProfile, updateMyCreatorProfile } from '../../api/studio'
import type { CreatorSelf } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { MY_CREATOR_QUERY_KEY } from './studioQueries'

type CreatorProfileFormProps = {
  profile: CreatorSelf | null
  onCancel?: () => void
}

export function CreatorProfileForm({ profile, onCancel }: CreatorProfileFormProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [bioFa, setBioFa] = useState(profile?.bio_fa ?? '')
  const [bioEn, setBioEn] = useState(profile?.bio_en ?? '')

  const mutation = useMutation({
    mutationFn: () =>
      profile
        ? updateMyCreatorProfile({ bio_fa: bioFa, bio_en: bioEn })
        : createMyCreatorProfile({ bio_fa: bioFa, bio_en: bioEn }),
    onSuccess: (data) => {
      queryClient.setQueryData(MY_CREATOR_QUERY_KEY, data)
      onCancel?.()
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <form className="studio-profile-form" onSubmit={handleSubmit}>
      <div className="studio-profile-form__intro">
        <p className="eyebrow">
          {profile ? t('studio.profile.editEyebrow') : t('studio.profile.setupEyebrow')}
        </p>
        <h2>{profile ? t('studio.profile.editTitle') : t('studio.profile.setupTitle')}</h2>
        <p>{profile ? t('studio.profile.editBody') : t('studio.profile.setupBody')}</p>
      </div>

      <label className="studio-field">
        <span>{t('studio.profile.bioFa')}</span>
        <textarea
          value={bioFa}
          rows={5}
          dir="rtl"
          lang="fa"
          placeholder={t('studio.profile.bioFaPlaceholder')}
          disabled={mutation.isPending}
          aria-invalid={Boolean(firstFieldError(mutation.error, 'bio_fa'))}
          onChange={(event) => {
            setBioFa(event.target.value)
            mutation.reset()
          }}
        />
        {firstFieldError(mutation.error, 'bio_fa') && (
          <span className="form-error" role="alert">
            {firstFieldError(mutation.error, 'bio_fa')}
          </span>
        )}
      </label>

      <label className="studio-field">
        <span>{t('studio.profile.bioEn')}</span>
        <textarea
          value={bioEn}
          rows={5}
          dir="ltr"
          lang="en"
          placeholder={t('studio.profile.bioEnPlaceholder')}
          disabled={mutation.isPending}
          aria-invalid={Boolean(firstFieldError(mutation.error, 'bio_en'))}
          onChange={(event) => {
            setBioEn(event.target.value)
            mutation.reset()
          }}
        />
        {firstFieldError(mutation.error, 'bio_en') && (
          <span className="form-error" role="alert">
            {firstFieldError(mutation.error, 'bio_en')}
          </span>
        )}
      </label>

      {mutation.isError &&
        !firstFieldError(mutation.error, 'bio_fa') &&
        !firstFieldError(mutation.error, 'bio_en') && (
          <p className="form-error" role="alert">
            {t('studio.profile.saveError')}
          </p>
        )}

      <div className="studio-profile-form__actions">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t('studio.profile.saving')
            : profile
              ? t('studio.profile.saveChanges')
              : t('studio.profile.create')}
        </Button>
        {profile && onCancel && (
          <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
      </div>

      <p className="studio-profile-form__media-note">{t('studio.profile.avatarLater')}</p>
    </form>
  )
}
