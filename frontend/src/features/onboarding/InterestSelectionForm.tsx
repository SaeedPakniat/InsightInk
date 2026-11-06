import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { Topic } from '../../api/types'
import { Button } from '../../components/ui/Button'

type InterestSelectionFormProps = {
  topics: Topic[]
  initialTopicIds: number[]
  isSaving: boolean
  saveError: boolean
  onSave: (topicIds: number[]) => void
}

export function InterestSelectionForm({
  topics,
  initialTopicIds,
  isSaving,
  saveError,
  onSave,
}: InterestSelectionFormProps) {
  const { i18n, t } = useTranslation()
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>(initialTopicIds)
  const isEnglish = i18n.language.startsWith('en')

  const toggleTopic = (topicId: number) => {
    setSelectedTopicIds((current) =>
      current.includes(topicId) ? current.filter((id) => id !== topicId) : [...current, topicId],
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(selectedTopicIds)
  }

  return (
    <form className="interests-form" onSubmit={handleSubmit}>
      <div className="interests-form__summary" aria-live="polite">
        <span>{t('onboarding.interests.selectedCount', { count: selectedTopicIds.length })}</span>
        <span>{t('onboarding.interests.canChangeLater')}</span>
      </div>

      <div className="topic-grid">
        {topics.map((topic) => {
          const selected = selectedTopicIds.includes(topic.id)
          const primaryName = isEnglish ? topic.name_en : topic.name_fa
          const secondaryName = isEnglish ? topic.name_fa : topic.name_en

          return (
            <button
              className="topic-option"
              type="button"
              key={topic.id}
              aria-pressed={selected}
              onClick={() => toggleTopic(topic.id)}
            >
              <span className="topic-option__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="m6.5 12.5 3.3 3.3 7.7-8" />
                </svg>
              </span>
              <span className="topic-option__text">
                <strong lang={isEnglish ? 'en' : 'fa'}>{primaryName}</strong>
                <span lang={isEnglish ? 'fa' : 'en'} dir={isEnglish ? 'rtl' : 'ltr'}>
                  {secondaryName}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {saveError && (
        <p className="form-error" role="alert">
          {t('onboarding.interests.saveError')}
        </p>
      )}

      <div className="interests-form__actions">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('onboarding.interests.saving') : t('onboarding.interests.continue')}
        </Button>
      </div>
    </form>
  )
}
