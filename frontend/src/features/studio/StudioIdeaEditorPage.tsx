import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { firstFieldError } from '../../api/client'
import { createMyIdea, updateMyIdea } from '../../api/studio'
import type {
  ContentLanguage,
  CreatorIdea,
  CreatorIdeaPayload,
  IdeaSource,
  Topic,
} from '../../api/types'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/Feedback'
import { useAvailableLanguages } from '../languages/languageQueries'
import { useTopics } from '../onboarding/interests'
import { CustomSourceForm } from './CustomSourceForm'
import { StudioStatusBadge } from './StudioStatusBadge'
import {
  MY_IDEAS_QUERY_KEY,
  myIdeaQueryKey,
  useMyCreatorProfile,
  useMyIdea,
  useSources,
} from './studioQueries'

export function StudioIdeaEditorPage() {
  const { ideaId: ideaIdParam } = useParams()
  const { t } = useTranslation()
  const editing = ideaIdParam !== undefined
  const ideaId = editing ? Number(ideaIdParam) : 0
  const validIdeaId = !editing || (Number.isInteger(ideaId) && ideaId > 0)

  const profileQuery = useMyCreatorProfile()
  const ideaQuery = useMyIdea(ideaId, editing && validIdeaId && Boolean(profileQuery.data))
  const languagesQuery = useAvailableLanguages()
  const topicsQuery = useTopics()
  const sourcesQuery = useSources()

  if (
    profileQuery.isPending ||
    languagesQuery.isPending ||
    topicsQuery.isPending ||
    sourcesQuery.isPending ||
    (editing && validIdeaId && ideaQuery.isPending)
  ) {
    return <EditorLoading />
  }

  if (!validIdeaId) {
    return <EditorNotFound />
  }

  if (profileQuery.isError) {
    return (
      <ErrorState
        title={t('studio.editor.loadErrorTitle')}
        body={t('studio.editor.loadErrorBody')}
        onRetry={() => void profileQuery.refetch()}
      />
    )
  }

  if (!profileQuery.data) {
    return (
      <section className="studio-editor-page">
        <div className="studio-editor-page__rail">
          <div className="studio-editor-required">
            <span aria-hidden="true">✦</span>
            <h1>{t('studio.editor.creatorRequiredTitle')}</h1>
            <p>{t('studio.editor.creatorRequiredBody')}</p>
            <Link className="button button--primary" to="/studio">
              {t('studio.editor.setupCreator')}
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (
    languagesQuery.isError ||
    topicsQuery.isError ||
    sourcesQuery.isError ||
    (editing && ideaQuery.isError)
  ) {
    return (
      <ErrorState
        title={t('studio.editor.loadErrorTitle')}
        body={t('studio.editor.loadErrorBody')}
        onRetry={() => {
          void languagesQuery.refetch()
          void topicsQuery.refetch()
          void sourcesQuery.refetch()
          if (editing) void ideaQuery.refetch()
        }}
      />
    )
  }

  if (languagesQuery.data.length === 0 || sourcesQuery.data.length === 0) {
    return (
      <section className="studio-editor-page">
        <div className="studio-editor-page__rail">
          <nav className="studio-page__back">
            <Link to="/studio">{t('studio.editor.backToStudio')}</Link>
          </nav>
          <div className="studio-editor-required">
            <span aria-hidden="true">∅</span>
            <h1>{t('studio.editor.catalogEmptyTitle')}</h1>
            <p>{t('studio.editor.catalogEmptyBody')}</p>
          </div>
        </div>
      </section>
    )
  }

  const idea = editing ? ideaQuery.data : null

  if (editing && !idea) {
    return <EditorNotFound />
  }

  if (idea && idea.status !== 'draft') {
    return (
      <section className="studio-editor-page">
        <div className="studio-editor-page__rail">
          <nav className="studio-page__back">
            <Link to="/studio">{t('studio.editor.backToStudio')}</Link>
          </nav>
          <div className="studio-editor-required">
            <StudioStatusBadge status={idea.status} />
            <h1>{t('studio.editor.readOnlyTitle')}</h1>
            <p>{t('studio.editor.readOnlyBody')}</p>
            {idea.status === 'published' && (
              <Link className="button button--secondary" to={`/ideas/${idea.id}`}>
                {t('studio.viewPublishedIdea')}
              </Link>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <StudioIdeaForm
      key={idea?.id ?? 'new'}
      idea={idea ?? null}
      languages={languagesQuery.data}
      topics={topicsQuery.data}
      sources={sourcesQuery.data}
    />
  )
}

function StudioIdeaForm({
  idea,
  languages,
  topics,
  sources,
}: {
  idea: CreatorIdea | null
  languages: ContentLanguage[]
  topics: Topic[]
  sources: IdeaSource[]
}) {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEnglishUi = i18n.language.startsWith('en')

  const defaultLanguage =
    idea?.language ??
    languages.find((language) => language.code === i18n.language)?.code ??
    languages[0]?.code ??
    ''
  const [language, setLanguage] = useState(defaultLanguage)
  const [title, setTitle] = useState(idea?.title ?? '')
  const [body, setBody] = useState(idea?.body ?? '')
  const [readSeconds, setReadSeconds] = useState(idea ? String(idea.estimated_read_seconds) : '60')
  const [sourceId, setSourceId] = useState(
    idea ? String(idea.source) : sources[0] ? String(sources[0].id) : '',
  )
  const [topicIds, setTopicIds] = useState<number[]>(idea?.topics ?? [])
  const [addingSource, setAddingSource] = useState(false)

  const mutation = useMutation({
    mutationFn: (payload: CreatorIdeaPayload) =>
      idea ? updateMyIdea(idea.id, payload) : createMyIdea(payload),
    onSuccess: (saved) => {
      queryClient.setQueryData<CreatorIdea[]>(MY_IDEAS_QUERY_KEY, (current) => {
        if (!current) return [saved]
        const exists = current.some((item) => item.id === saved.id)
        return exists
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current]
      })
      queryClient.setQueryData(myIdeaQueryKey(saved.id), saved)
      navigate('/studio', { replace: true })
    },
  })

  const seconds = Number(readSeconds)
  const valid =
    language.length > 0 &&
    title.trim().length > 0 &&
    title.trim().length <= 255 &&
    body.trim().length > 0 &&
    Number.isInteger(seconds) &&
    seconds > 0 &&
    Number(sourceId) > 0

  const toggleTopic = (topicId: number) => {
    setTopicIds((current) =>
      current.includes(topicId) ? current.filter((id) => id !== topicId) : [...current, topicId],
    )
    mutation.reset()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!valid || mutation.isPending) return

    mutation.mutate({
      language,
      title: title.trim(),
      body: body.trim(),
      estimated_read_seconds: seconds,
      source: Number(sourceId),
      topics: topicIds,
    })
  }

  return (
    <section className="studio-editor-page">
      <div className="studio-editor-page__rail">
        <nav className="studio-page__back">
          <Link to="/studio">{t('studio.editor.backToStudio')}</Link>
        </nav>

        <header className="studio-editor-page__header">
          <p className="eyebrow">{t('studio.editor.eyebrow')}</p>
          <h1>{idea ? t('studio.editor.editTitle') : t('studio.editor.newTitle')}</h1>
          <p>{idea ? t('studio.editor.editBody') : t('studio.editor.newBody')}</p>
        </header>

        <form className="studio-idea-form" onSubmit={handleSubmit}>
          <section className="studio-panel studio-idea-form__section">
            <div className="studio-idea-form__section-heading">
              <span>01</span>
              <div>
                <h2>{t('studio.editor.contentSection')}</h2>
                <p>{t('studio.editor.contentSectionBody')}</p>
              </div>
            </div>

            <label className="studio-field">
              <span>{t('studio.editor.language')}</span>
              <select
                aria-label={t('studio.editor.language')}
                value={language}
                disabled={mutation.isPending}
                aria-invalid={Boolean(firstFieldError(mutation.error, 'language'))}
                onChange={(event) => {
                  setLanguage(event.target.value)
                  mutation.reset()
                }}
              >
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.native_name || item.name_en} · {isEnglishUi ? item.name_en : item.name_fa}
                  </option>
                ))}
              </select>
              {firstFieldError(mutation.error, 'language') && (
                <span className="studio-field__error" role="alert">
                  {firstFieldError(mutation.error, 'language')}
                </span>
              )}
            </label>

            <label className="studio-field">
              <span>{t('studio.editor.title')}</span>
              <input
                aria-label={t('studio.editor.title')}
                value={title}
                maxLength={255}
                dir="auto"
                disabled={mutation.isPending}
                aria-invalid={Boolean(firstFieldError(mutation.error, 'title'))}
                placeholder={t('studio.editor.titlePlaceholder')}
                onChange={(event) => {
                  setTitle(event.target.value)
                  mutation.reset()
                }}
              />
              <span className="studio-field__meta">
                {t('studio.editor.titleCount', {
                  count: new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(title.length),
                  max: new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(255),
                })}
              </span>
              {firstFieldError(mutation.error, 'title') && (
                <span className="studio-field__error" role="alert">
                  {firstFieldError(mutation.error, 'title')}
                </span>
              )}
            </label>

            <label className="studio-field">
              <span>{t('studio.editor.body')}</span>
              <textarea
                aria-label={t('studio.editor.body')}
                value={body}
                rows={12}
                dir="auto"
                disabled={mutation.isPending}
                aria-invalid={Boolean(firstFieldError(mutation.error, 'body'))}
                placeholder={t('studio.editor.bodyPlaceholder')}
                onChange={(event) => {
                  setBody(event.target.value)
                  mutation.reset()
                }}
              />
              {firstFieldError(mutation.error, 'body') && (
                <span className="studio-field__error" role="alert">
                  {firstFieldError(mutation.error, 'body')}
                </span>
              )}
            </label>

            <label className="studio-field studio-field--compact">
              <span>{t('studio.editor.readSeconds')}</span>
              <input
                aria-label={t('studio.editor.readSeconds')}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={readSeconds}
                disabled={mutation.isPending}
                aria-invalid={Boolean(firstFieldError(mutation.error, 'estimated_read_seconds'))}
                onChange={(event) => {
                  setReadSeconds(event.target.value)
                  mutation.reset()
                }}
              />
              <span className="studio-field__meta">{t('studio.editor.readSecondsHint')}</span>
              {firstFieldError(mutation.error, 'estimated_read_seconds') && (
                <span className="studio-field__error" role="alert">
                  {firstFieldError(mutation.error, 'estimated_read_seconds')}
                </span>
              )}
            </label>
          </section>

          <section className="studio-panel studio-idea-form__section">
            <div className="studio-idea-form__section-heading">
              <span>02</span>
              <div>
                <h2>{t('studio.editor.contextSection')}</h2>
                <p>{t('studio.editor.contextSectionBody')}</p>
              </div>
            </div>

            <label className="studio-field">
              <span>{t('studio.editor.source')}</span>
              <select
                aria-label={t('studio.editor.source')}
                value={sourceId}
                disabled={mutation.isPending}
                aria-invalid={Boolean(firstFieldError(mutation.error, 'source'))}
                onChange={(event) => {
                  setSourceId(event.target.value)
                  mutation.reset()
                }}
              >
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {t(`idea.format.${source.type}`)} · {source.title}
                    {source.original_creator_text ? ` — ${source.original_creator_text}` : ''}
                  </option>
                ))}
              </select>
              <div className="studio-field__meta studio-field__meta--actions">
                <span>{t('studio.editor.sourceHint')}</span>
                <button
                  type="button"
                  className="studio-inline-action"
                  onClick={() => setAddingSource((current) => !current)}
                >
                  {addingSource ? t('common.cancel') : t('studio.editor.addCustomSource')}
                </button>
              </div>
              {firstFieldError(mutation.error, 'source') && (
                <span className="studio-field__error" role="alert">
                  {firstFieldError(mutation.error, 'source')}
                </span>
              )}
            </label>

            {addingSource && (
              <CustomSourceForm
                languages={languages}
                onCancel={() => setAddingSource(false)}
                onCreated={(source) => {
                  setSourceId(String(source.id))
                  setAddingSource(false)
                  mutation.reset()
                }}
              />
            )}

            <fieldset className="studio-topic-fieldset">
              <legend>{t('studio.editor.topics')}</legend>
              <p>{t('studio.editor.topicsHint')}</p>
              <div className="studio-topic-grid">
                {topics.map((topic) => {
                  const selected = topicIds.includes(topic.id)
                  return (
                    <button
                      type="button"
                      key={topic.id}
                      aria-pressed={selected}
                      disabled={mutation.isPending}
                      onClick={() => toggleTopic(topic.id)}
                    >
                      <span>{isEnglishUi ? topic.name_en : topic.name_fa}</span>
                      <small>{isEnglishUi ? topic.name_fa : topic.name_en}</small>
                    </button>
                  )
                })}
              </div>
              {firstFieldError(mutation.error, 'topics') && (
                <span className="studio-field__error" role="alert">
                  {firstFieldError(mutation.error, 'topics')}
                </span>
              )}
            </fieldset>
          </section>

          {mutation.isError &&
            !['language', 'title', 'body', 'estimated_read_seconds', 'source', 'topics'].some(
              (field) => firstFieldError(mutation.error, field),
            ) && (
              <p className="form-error" role="alert">
                {t('studio.editor.saveError')}
              </p>
            )}

          <div className="studio-idea-form__actions">
            <Button type="submit" disabled={!valid || mutation.isPending}>
              {mutation.isPending
                ? t('studio.editor.saving')
                : idea
                  ? t('studio.editor.saveChanges')
                  : t('studio.editor.saveDraft')}
            </Button>
            <Link className="button button--ghost" to="/studio">
              {t('common.cancel')}
            </Link>
          </div>
        </form>
      </div>
    </section>
  )
}

function EditorLoading() {
  const { t } = useTranslation()

  return (
    <section className="studio-editor-page" role="status" aria-live="polite">
      <span className="sr-only">{t('studio.editor.loading')}</span>
      <div className="studio-editor-page__rail" aria-hidden="true">
        <div className="studio-loading">
          <span className="idea-skeleton studio-loading__title" />
          <span className="idea-skeleton studio-loading__panel" />
          <span className="idea-skeleton studio-loading__panel" />
        </div>
      </div>
    </section>
  )
}

function EditorNotFound() {
  const { t } = useTranslation()

  return (
    <section className="studio-editor-page">
      <div className="studio-editor-page__rail">
        <div className="studio-editor-required">
          <span aria-hidden="true">404</span>
          <h1>{t('studio.editor.notFoundTitle')}</h1>
          <p>{t('studio.editor.notFoundBody')}</p>
          <Link className="button button--secondary" to="/studio">
            {t('studio.editor.backToStudio')}
          </Link>
        </div>
      </div>
    </section>
  )
}
