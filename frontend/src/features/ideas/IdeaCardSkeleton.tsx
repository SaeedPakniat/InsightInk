export function IdeaCardSkeleton() {
  return (
    <div className="idea-card idea-card--skeleton" aria-hidden="true">
      <div className="idea-card__meta">
        <span className="idea-skeleton idea-skeleton--badge" />
        <span className="idea-skeleton idea-skeleton--time" />
      </div>
      <div className="idea-card__content">
        <span className="idea-skeleton idea-skeleton--title" />
        <span className="idea-skeleton idea-skeleton--line" />
        <span className="idea-skeleton idea-skeleton--line idea-skeleton--line-short" />
      </div>
      <div className="idea-card__topics">
        <span className="idea-skeleton idea-skeleton--topic" />
        <span className="idea-skeleton idea-skeleton--topic" />
      </div>
      <div className="idea-card__footer">
        <span className="idea-skeleton idea-skeleton--avatar" />
        <div className="idea-skeleton-stack">
          <span className="idea-skeleton idea-skeleton--source" />
          <span className="idea-skeleton idea-skeleton--source idea-skeleton--source-short" />
        </div>
      </div>
    </div>
  )
}
