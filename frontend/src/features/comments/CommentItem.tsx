import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { IdeaComment } from '../../api/types'
import { inferTextDirection } from './textDirection'

type CommentItemProps = {
  comment: IdeaComment
  canDelete: boolean
  isDeleting: boolean
  onDelete: (commentId: number) => void
}

export function CommentItem({ comment, canDelete, isDeleting, onDelete }: CommentItemProps) {
  const { i18n, t } = useTranslation()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const isEnglishUi = i18n.language.startsWith('en')
  const direction = inferTextDirection(comment.body)
  const date = new Intl.DateTimeFormat(isEnglishUi ? 'en' : 'fa', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(comment.created_at))

  return (
    <article className={`comment-item${comment.id < 0 ? ' comment-item--optimistic' : ''}`}>
      <header className="comment-item__header">
        <div className="comment-item__author">
          <strong dir="auto">{comment.author.display_name}</strong>
          <time dateTime={comment.created_at}>{date}</time>
          {comment.id < 0 && <span>{t('comments.postingShort')}</span>}
        </div>

        {canDelete && comment.id > 0 && (
          <div className="comment-item__delete">
            {confirmingDelete ? (
              <>
                <button
                  type="button"
                  className="comment-item__delete-confirm"
                  disabled={isDeleting}
                  onClick={() => onDelete(comment.id)}
                >
                  {isDeleting ? t('comments.deleting') : t('comments.confirmDelete')}
                </button>
                <button
                  type="button"
                  className="comment-item__delete-cancel"
                  disabled={isDeleting}
                  onClick={() => setConfirmingDelete(false)}
                >
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="comment-item__delete-trigger"
                onClick={() => setConfirmingDelete(true)}
              >
                {t('comments.delete')}
              </button>
            )}
          </div>
        )}
      </header>

      <p className="comment-item__body" dir={direction}>
        {comment.body}
      </p>
    </article>
  )
}
