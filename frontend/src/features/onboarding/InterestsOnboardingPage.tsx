import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { updateInterests } from '../../api/interests'
import { Card } from '../../components/ui/Card'
import { ErrorState } from '../../components/ui/Feedback'
import { InterestSelectionForm } from './InterestSelectionForm'
import { RECOMMENDATIONS_QUERY_KEY } from '../feed/recommendations'
import { INTERESTS_QUERY_KEY, useInterests, useTopics } from './interests'

export function InterestsOnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const topicsQuery = useTopics()
  const interestsQuery = useInterests()

  const saveMutation = useMutation({
    mutationFn: updateInterests,
    onSuccess: (data) => {
      queryClient.setQueryData(INTERESTS_QUERY_KEY, data)
      void queryClient.invalidateQueries({ queryKey: RECOMMENDATIONS_QUERY_KEY })
      navigate('/app', { replace: true })
    },
  })

  if (topicsQuery.isPending || interestsQuery.isPending) {
    return (
      <section className="interests-page">
        <div className="interests-page__intro">
          <p className="eyebrow">{t('onboarding.interests.eyebrow')}</p>
          <h1>{t('onboarding.interests.title')}</h1>
          <p>{t('onboarding.interests.body')}</p>
        </div>
        <div className="topic-grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="topic-skeleton" key={index} />
          ))}
        </div>
      </section>
    )
  }

  if (topicsQuery.isError || interestsQuery.isError) {
    return (
      <ErrorState
        title={t('onboarding.interests.loadErrorTitle')}
        body={t('onboarding.interests.loadErrorBody')}
        onRetry={() => {
          void topicsQuery.refetch()
          void interestsQuery.refetch()
        }}
      />
    )
  }

  if (topicsQuery.data.length === 0) {
    return (
      <section className="interests-page interests-page--empty">
        <div className="interests-page__intro">
          <p className="eyebrow">{t('onboarding.interests.eyebrow')}</p>
          <h1>{t('onboarding.interests.title')}</h1>
        </div>
        <Card className="interests-empty">
          <span className="interests-empty__mark" aria-hidden="true">
            ∅
          </span>
          <h2>{t('onboarding.interests.emptyTitle')}</h2>
          <p>{t('onboarding.interests.emptyBody')}</p>
          <Link className="button button--secondary" to="/app">
            {t('onboarding.interests.backToApp')}
          </Link>
        </Card>
      </section>
    )
  }

  return (
    <section className="interests-page">
      <div className="interests-page__intro">
        <p className="eyebrow">{t('onboarding.interests.eyebrow')}</p>
        <h1>{t('onboarding.interests.title')}</h1>
        <p>{t('onboarding.interests.body')}</p>
      </div>

      <InterestSelectionForm
        topics={topicsQuery.data}
        initialTopicIds={interestsQuery.data.topics.map((topic) => topic.id)}
        isSaving={saveMutation.isPending}
        saveError={saveMutation.isError}
        onSave={(topicIds) => saveMutation.mutate({ topics: topicIds })}
      />
    </section>
  )
}
