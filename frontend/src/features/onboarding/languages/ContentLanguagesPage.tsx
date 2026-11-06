import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { updateContentLanguages } from '../../../api/languages'
import { ErrorState } from '../../../components/ui/Feedback'
import { LATEST_FEED_QUERY_KEY } from '../../feed/latestFeed'
import { RECOMMENDATIONS_QUERY_KEY } from '../../feed/recommendations'
import { ContentLanguageSelectionForm } from './ContentLanguageSelectionForm'
import {
  CONTENT_LANGUAGES_QUERY_KEY,
  useAvailableLanguages,
  useContentLanguages,
} from '../../languages/languageQueries'

export function ContentLanguagesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const availableQuery = useAvailableLanguages()
  const currentQuery = useContentLanguages()

  const saveMutation = useMutation({
    mutationFn: updateContentLanguages,
    onSuccess: (data) => {
      queryClient.setQueryData(CONTENT_LANGUAGES_QUERY_KEY, data)
      void queryClient.invalidateQueries({ queryKey: RECOMMENDATIONS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: LATEST_FEED_QUERY_KEY })
      navigate('/app', { replace: true })
    },
  })

  if (availableQuery.isPending || currentQuery.isPending) {
    return (
      <section className="content-languages-page">
        <div className="content-languages-page__intro">
          <p className="eyebrow">{t('onboarding.languages.eyebrow')}</p>
          <h1>{t('onboarding.languages.title')}</h1>
          <p>{t('onboarding.languages.body')}</p>
        </div>

        <div className="content-language-grid" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <div className="content-language-skeleton" key={index} />
          ))}
        </div>
      </section>
    )
  }

  if (availableQuery.isError || currentQuery.isError) {
    return (
      <ErrorState
        title={t('onboarding.languages.loadErrorTitle')}
        body={t('onboarding.languages.loadErrorBody')}
        onRetry={() => {
          void availableQuery.refetch()
          void currentQuery.refetch()
        }}
      />
    )
  }

  return (
    <section className="content-languages-page">
      <div className="content-languages-page__intro">
        <p className="eyebrow">{t('onboarding.languages.eyebrow')}</p>
        <h1>{t('onboarding.languages.title')}</h1>
        <p>{t('onboarding.languages.body')}</p>
      </div>

      <ContentLanguageSelectionForm
        languages={availableQuery.data}
        initialCodes={currentQuery.data.languages.map((language) => language.code)}
        isSaving={saveMutation.isPending}
        saveError={saveMutation.isError}
        onSave={(codes) => saveMutation.mutate({ languages: codes })}
      />
    </section>
  )
}
