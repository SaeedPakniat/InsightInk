import type { RecommendationItem } from '../../api/types'
import { IdeaCard } from '../ideas/IdeaCard'

type RecommendedIdeaProps = {
  item: RecommendationItem
}

function reasonLanguage(reason: string): 'fa' | 'en' {
  return /[\u0600-\u06FF]/.test(reason) ? 'fa' : 'en'
}

export function RecommendedIdea({ item }: RecommendedIdeaProps) {
  const language = reasonLanguage(item.reason)

  return (
    <div className="recommended-idea">
      <div
        className="recommended-idea__reason"
        lang={language}
        dir={language === 'fa' ? 'rtl' : 'ltr'}
      >
        <span className="recommended-idea__spark" aria-hidden="true">
          ✦
        </span>
        <span>{item.reason}</span>
      </div>

      <IdeaCard idea={item.idea} />
    </div>
  )
}
