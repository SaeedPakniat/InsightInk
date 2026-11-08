import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { firstFieldError } from '../../api/client'
import { createMySource } from '../../api/studio'
import type { ContentLanguage, CreatorSourcePayload, IdeaSource, SourceType } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { SOURCES_QUERY_KEY } from './studioQueries'

const SOURCE_TYPES: SourceType[] = [
  'book',
  'article',
  'paper',
  'website',
  'video',
  'podcast',
  'movie',
  'course',
  'other',
]

export function CustomSourceForm({
  languages,
  onCreated,
  onCancel,
}: {
  languages: ContentLanguage[]
  onCreated: (source: IdeaSource) => void
  onCancel: () => void
}) {
  const { i18n, t } = useTranslation()
  const queryClient = useQueryClient()
  const [type, setType] = useState<SourceType>('website')
  const [title, setTitle] = useState('')
  const [creatorText, setCreatorText] = useState('')
  const [language, setLanguage] = useState(
    languages.find((item) => item.code === i18n.language)?.code ?? languages[0]?.code ?? '',
  )
  const [url, setUrl] = useState('')

  const mutation = useMutation({
    mutationFn: (payload: CreatorSourcePayload) => createMySource(payload),
    onSuccess: (source) => {
      queryClient.setQueryData<IdeaSource[]>(SOURCES_QUERY_KEY, (current) => {
        const list = current ?? []
        return list.some((item) => item.id === source.id) ? list : [...list, source]
      })
      onCreated(source)
    },
  })

  const handleCreate = () => {
    if (!title.trim() || !language || mutation.isPending) return

    mutation.mutate({
      type,
      title: title.trim(),
      original_creator_text: creatorText.trim(),
      language,
      external_url: url.trim(),
    })
  }

  return (
    <div className="studio-custom-source">
      <header>
        <strong>{t('studio.editor.customSourceTitle')}</strong>
        <p>{t('studio.editor.customSourceBody')}</p>
      </header>

      <div className="studio-custom-source__grid">
        <label className="studio-field">
          <span>{t('studio.editor.sourceType')}</span>
          <select
            value={type}
            disabled={mutation.isPending}
            onChange={(event) => {
              setType(event.target.value as SourceType)
              mutation.reset()
            }}
          >
            {SOURCE_TYPES.map((item) => (
              <option key={item} value={item}>
                {t(`idea.format.${item}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="studio-field">
          <span>{t('studio.editor.sourceLanguage')}</span>
          <select
            value={language}
            disabled={mutation.isPending}
            onChange={(event) => {
              setLanguage(event.target.value)
              mutation.reset()
            }}
          >
            {languages.map((item) => (
              <option key={item.code} value={item.code}>
                {item.native_name || item.name_en}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="studio-field">
        <span>{t('studio.editor.sourceTitle')}</span>
        <input
          value={title}
          maxLength={255}
          disabled={mutation.isPending}
          aria-invalid={Boolean(firstFieldError(mutation.error, 'title'))}
          onChange={(event) => {
            setTitle(event.target.value)
            mutation.reset()
          }}
        />
        {firstFieldError(mutation.error, 'title') && (
          <span className="studio-field__error" role="alert">
            {firstFieldError(mutation.error, 'title')}
          </span>
        )}
      </label>

      <label className="studio-field">
        <span>{t('studio.editor.sourceCreator')}</span>
        <input
          value={creatorText}
          disabled={mutation.isPending}
          onChange={(event) => {
            setCreatorText(event.target.value)
            mutation.reset()
          }}
        />
      </label>

      <label className="studio-field">
        <span>{t('studio.editor.sourceUrl')}</span>
        <input
          type="url"
          value={url}
          dir="ltr"
          disabled={mutation.isPending}
          aria-invalid={Boolean(firstFieldError(mutation.error, 'external_url'))}
          placeholder="https://…"
          onChange={(event) => {
            setUrl(event.target.value)
            mutation.reset()
          }}
        />
        {firstFieldError(mutation.error, 'external_url') && (
          <span className="studio-field__error" role="alert">
            {firstFieldError(mutation.error, 'external_url')}
          </span>
        )}
      </label>

      {mutation.isError &&
        !firstFieldError(mutation.error, 'title') &&
        !firstFieldError(mutation.error, 'external_url') && (
          <p className="form-error" role="alert">
            {t('studio.editor.customSourceError')}
          </p>
        )}

      <div className="studio-custom-source__actions">
        <Button
          type="button"
          disabled={!title.trim() || !language || mutation.isPending}
          onClick={handleCreate}
        >
          {mutation.isPending ? t('studio.editor.creatingSource') : t('studio.editor.createSource')}
        </Button>
        <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  )
}
