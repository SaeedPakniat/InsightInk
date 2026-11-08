import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { deleteMyIdea, publishMyIdea, withdrawMyIdea } from '../../api/studio'
import type { CreatorIdea, CreatorIdeaStatus, IdeaSource } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/Feedback'
import { creatorIdeasQueryKey, creatorQueryKey } from '../creators/creatorQueries'
import { LATEST_FEED_QUERY_KEY } from '../feed/latestFeed'
import { RECOMMENDATIONS_QUERY_KEY } from '../feed/recommendations'
import { formatUiNumber } from '../ideas/presentation'
import { CreatorProfileForm } from './CreatorProfileForm'
import { StudioStatusBadge } from './StudioStatusBadge'
import { MY_IDEAS_QUERY_KEY, useMyCreatorProfile, useMyIdeas, useSources } from './studioQueries'

type StudioFilter = CreatorIdeaStatus | 'all'

const FILTERS: StudioFilter[] = ['all', 'draft', 'published', 'withdrawn', 'hidden']

export function CreatorStudioPage() {
  const { i18n, t } = useTranslation()
  const [editingProfile, setEditingProfile] = useState(false)
  const [filter, setFilter] = useState<StudioFilter>('all')
  const isEnglishUi = i18n.language.startsWith('en')
  const profileQuery = useMyCreatorProfile()
  const profile = profileQuery.data ?? null
  const ideasQuery = useMyIdeas(Boolean(profile))
  const sourcesQuery = useSources()

  if (profileQuery.isPending) {
    return <StudioLoading />
  }

  if (profileQuery.isError) {
    return (
      <ErrorState
        title={t('studio.loadErrorTitle')}
        body={t('studio.loadErrorBody')}
        onRetry={() => void profileQuery.refetch()}
      />
    )
  }

  if (!profile) {
    return (
      <section className="studio-page studio-page--setup">
        <div className="studio-page__rail">
          <nav className="studio-page__back">
            <Link to="/app">{t('studio.backToFeed')}</Link>
          </nav>

          <header className="studio-page__intro">
            <p className="eyebrow">{t('studio.eyebrow')}</p>
            <h1>{t('studio.becomeCreatorTitle')}</h1>
            <p>{t('studio.becomeCreatorBody')}</p>
          </header>

          <div className="studio-panel">
            <CreatorProfileForm profile={null} />
          </div>
        </div>
      </section>
    )
  }

  if (ideasQuery.isPending || sourcesQuery.isPending) {
    return <StudioLoading />
  }

  if (ideasQuery.isError || sourcesQuery.isError) {
    return (
      <ErrorState
        title={t('studio.ideasLoadErrorTitle')}
        body={t('studio.ideasLoadErrorBody')}
        onRetry={() => {
          void ideasQuery.refetch()
          void sourcesQuery.refetch()
        }}
      />
    )
  }

  const ideas = ideasQuery.data
  const filteredIdeas = filter === 'all' ? ideas : ideas.filter((idea) => idea.status === filter)

  const counts = {
    all: ideas.length,
    draft: ideas.filter((idea) => idea.status === 'draft').length,
    published: ideas.filter((idea) => idea.status === 'published').length,
    withdrawn: ideas.filter((idea) => idea.status === 'withdrawn').length,
    hidden: ideas.filter((idea) => idea.status === 'hidden').length,
  }

  const sourceMap = new Map((sourcesQuery.data ?? []).map((source) => [source.id, source]))

  return (
    <section className="studio-page">
      <div className="studio-page__rail">
        <header className="studio-page__header">
          <div>
            <p className="eyebrow">{t('studio.eyebrow')}</p>
            <h1>{t('studio.title')}</h1>
            <p>{t('studio.body')}</p>
          </div>

          <div className="studio-page__header-actions">
            <Link className="button button--primary" to="/studio/ideas/new">
              {t('studio.newIdea')}
            </Link>
            <Link className="button button--secondary" to={`/creators/${profile.id}`}>
              {t('studio.viewPublicProfile')}
            </Link>
          </div>
        </header>

        <section className="studio-profile-summary">
          <div>
            <span className="studio-profile-summary__label">{t('studio.profileLabel')}</span>
            <strong>
              {profile.is_verified ? t('studio.verifiedCreator') : t('studio.creatorReady')}
            </strong>
            <p>
              {profile.bio_en || profile.bio_fa
                ? t('studio.profileReadyBody')
                : t('studio.profileEmptyBody')}
            </p>
          </div>
          <Button variant="ghost" onClick={() => setEditingProfile((current) => !current)}>
            {editingProfile ? t('common.cancel') : t('studio.editProfile')}
          </Button>
        </section>

        {editingProfile && (
          <div className="studio-panel studio-panel--profile">
            <CreatorProfileForm profile={profile} onCancel={() => setEditingProfile(false)} />
          </div>
        )}

        <section className="studio-workspace" aria-labelledby="studio-ideas-title">
          <header className="studio-workspace__header">
            <div>
              <p className="eyebrow">{t('studio.workspaceEyebrow')}</p>
              <h2 id="studio-ideas-title">{t('studio.workspaceTitle')}</h2>
              <p>{t('studio.workspaceBody')}</p>
            </div>
          </header>

          <nav className="studio-filters" aria-label={t('studio.filterNavigation')}>
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                <span>{t(`studio.filter.${item}`)}</span>
                <span>{formatUiNumber(counts[item], isEnglishUi)}</span>
              </button>
            ))}
          </nav>

          {filteredIdeas.length === 0 ? (
            <div className="studio-empty">
              <span aria-hidden="true">◇</span>
              <strong>
                {filter === 'all' ? t('studio.emptyTitle') : t('studio.emptyFilterTitle')}
              </strong>
              <p>{filter === 'all' ? t('studio.emptyBody') : t('studio.emptyFilterBody')}</p>
              {filter === 'all' && (
                <Link className="button button--primary" to="/studio/ideas/new">
                  {t('studio.createFirstIdea')}
                </Link>
              )}
            </div>
          ) : (
            <div className="studio-idea-list">
              {filteredIdeas.map((idea) => (
                <StudioIdeaRow
                  key={idea.id}
                  idea={idea}
                  source={sourceMap.get(idea.source)}
                  isEnglishUi={isEnglishUi}
                  creatorId={profile.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function StudioIdeaRow({
  idea,
  source,
  isEnglishUi,
  creatorId,
}: {
  idea: CreatorIdea
  source: IdeaSource | undefined
  isEnglishUi: boolean
  creatorId: number
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState<'publish' | 'delete' | 'withdraw' | null>(null)

  const publishMutation = useMutation({
    mutationFn: () => publishMyIdea(idea.id),
    onSuccess: (published) => {
      queryClient.setQueryData<CreatorIdea[]>(MY_IDEAS_QUERY_KEY, (current) =>
        current?.map((item) => (item.id === published.id ? published : item)),
      )
      void queryClient.invalidateQueries({ queryKey: LATEST_FEED_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: RECOMMENDATIONS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
      void queryClient.invalidateQueries({ queryKey: creatorQueryKey(creatorId) })
      void queryClient.invalidateQueries({
        queryKey: creatorIdeasQueryKey(creatorId),
      })
      setConfirming(null)
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawMyIdea(idea.id),
    onSuccess: (withdrawn) => {
      queryClient.setQueryData<CreatorIdea[]>(MY_IDEAS_QUERY_KEY, (current) =>
        current?.map((item) => (item.id === withdrawn.id ? withdrawn : item)),
      )
      queryClient.removeQueries({ queryKey: ['idea', withdrawn.id] })
      void queryClient.invalidateQueries({ queryKey: LATEST_FEED_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: RECOMMENDATIONS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
      void queryClient.invalidateQueries({ queryKey: ['library'] })
      void queryClient.invalidateQueries({ queryKey: creatorQueryKey(creatorId) })
      void queryClient.invalidateQueries({
        queryKey: creatorIdeasQueryKey(creatorId),
      })
      setConfirming(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteMyIdea(idea.id),
    onSuccess: () => {
      queryClient.setQueryData<CreatorIdea[]>(MY_IDEAS_QUERY_KEY, (current) =>
        current?.filter((item) => item.id !== idea.id),
      )
      setConfirming(null)
    },
  })

  const dateValue = idea.published_at ?? idea.updated_at
  const date = new Intl.DateTimeFormat(isEnglishUi ? 'en' : 'fa', {
    dateStyle: 'medium',
  }).format(new Date(dateValue))
  const busy = publishMutation.isPending || withdrawMutation.isPending || deleteMutation.isPending

  return (
    <article className="studio-idea-row">
      <div className="studio-idea-row__top">
        <StudioStatusBadge status={idea.status} />
        <time dateTime={dateValue}>{date}</time>
      </div>

      <div className="studio-idea-row__body">
        <h3 dir="auto">{idea.title}</h3>
        <p>
          {source
            ? `${t(`idea.format.${source.type}`)} · ${source.title}`
            : t('studio.sourceUnavailable')}
        </p>
      </div>

      {idea.status === 'hidden' && (
        <p className="studio-idea-row__notice">{t('studio.hiddenNotice')}</p>
      )}

      {idea.status === 'withdrawn' && (
        <p className="studio-idea-row__notice studio-idea-row__notice--withdrawn">
          {t('studio.withdrawnNotice')}
        </p>
      )}

      {idea.status === 'draft' && confirming === null && (
        <div className="studio-idea-row__actions">
          <Link className="button button--secondary" to={`/studio/ideas/${idea.id}/edit`}>
            {t('studio.editDraft')}
          </Link>
          <Button onClick={() => setConfirming('publish')}>{t('studio.publish')}</Button>
          <Button variant="ghost" onClick={() => setConfirming('delete')}>
            {t('studio.deleteDraft')}
          </Button>
        </div>
      )}

      {idea.status === 'published' && confirming === null && (
        <div className="studio-idea-row__actions">
          <Link className="button button--secondary" to={`/ideas/${idea.id}`}>
            {t('studio.viewPublishedIdea')}
          </Link>
          <Button variant="ghost" onClick={() => setConfirming('withdraw')}>
            {t('studio.withdraw')}
          </Button>
        </div>
      )}

      {confirming === 'publish' && (
        <div className="studio-confirmation">
          <div>
            <strong>{t('studio.publishConfirmTitle')}</strong>
            <p>{t('studio.publishConfirmBody')}</p>
          </div>
          <div className="studio-confirmation__actions">
            <Button disabled={busy} onClick={() => publishMutation.mutate()}>
              {publishMutation.isPending ? t('studio.publishing') : t('studio.confirmPublish')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
              {t('common.cancel')}
            </Button>
          </div>
          {publishMutation.isError && (
            <p className="form-error" role="alert">
              {t('studio.publishError')}
            </p>
          )}
        </div>
      )}

      {confirming === 'withdraw' && (
        <div className="studio-confirmation">
          <div>
            <strong>{t('studio.withdrawConfirmTitle')}</strong>
            <p>{t('studio.withdrawConfirmBody')}</p>
          </div>
          <div className="studio-confirmation__actions">
            <Button variant="secondary" disabled={busy} onClick={() => withdrawMutation.mutate()}>
              {withdrawMutation.isPending ? t('studio.withdrawing') : t('studio.confirmWithdraw')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
              {t('common.cancel')}
            </Button>
          </div>
          {withdrawMutation.isError && (
            <p className="form-error" role="alert">
              {t('studio.withdrawError')}
            </p>
          )}
        </div>
      )}

      {confirming === 'delete' && (
        <div className="studio-confirmation studio-confirmation--danger">
          <div>
            <strong>{t('studio.deleteConfirmTitle')}</strong>
            <p>{t('studio.deleteConfirmBody')}</p>
          </div>
          <div className="studio-confirmation__actions">
            <Button variant="secondary" disabled={busy} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? t('studio.deleting') : t('studio.confirmDelete')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
              {t('common.cancel')}
            </Button>
          </div>
          {deleteMutation.isError && (
            <p className="form-error" role="alert">
              {t('studio.deleteError')}
            </p>
          )}
        </div>
      )}
    </article>
  )
}

function StudioLoading() {
  const { t } = useTranslation()

  return (
    <section className="studio-page" role="status" aria-live="polite">
      <span className="sr-only">{t('studio.loading')}</span>
      <div className="studio-page__rail" aria-hidden="true">
        <div className="studio-loading">
          <span className="idea-skeleton studio-loading__title" />
          <span className="idea-skeleton studio-loading__panel" />
          <span className="idea-skeleton studio-loading__panel" />
        </div>
      </div>
    </section>
  )
}
