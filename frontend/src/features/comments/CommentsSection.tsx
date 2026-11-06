import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { firstFieldError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/Feedback'
import { useSession } from '../auth/session'
import { CommentItem } from './CommentItem'
import { useCreateComment, useDeleteComment, useIdeaComments } from './commentsQuery'

type CommentsSectionProps = {
  ideaId: number
}

export function CommentsSection({ ideaId }: CommentsSectionProps) {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const session = useSession()
  const commentsQuery = useIdeaComments(ideaId)
  const [body, setBody] = useState('')

  const createMutation = useCreateComment(
    ideaId,
    session.data ?? {
      id: 0,
      email: '',
      display_name: '',
      preferred_ui_language: 'en',
    },
  )
  const deleteMutation = useDeleteComment(ideaId)

  const isEnglishUi = i18n.language.startsWith('en')
  const comments = commentsQuery.data ?? []
  const formattedCount = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(
    comments.filter((comment) => comment.id > 0).length,
  )
  const formattedLength = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(body.length)
  const trimmedBody = body.trim()
  const bodyError = firstFieldError(createMutation.error, 'body')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session.data || !trimmedBody || createMutation.isPending) return

    const submittedBody = trimmedBody
    setBody('')

    createMutation.mutate(submittedBody, {
      onError: () => setBody(submittedBody),
    })
  }

  return (
    <section className="comments-section" aria-labelledby="comments-title">
      <header className="comments-section__header">
        <div>
          <p className="eyebrow">{t('comments.eyebrow')}</p>
          <h2 id="comments-title">{t('comments.title')}</h2>
          <p>{t('comments.body')}</p>
        </div>

        {!commentsQuery.isPending && !commentsQuery.isError && (
          <span className="comments-section__count">
            {t('comments.count', { count: formattedCount })}
          </span>
        )}
      </header>

      {session.isPending ? (
        <div className="comment-composer comment-composer--loading" aria-hidden="true" />
      ) : session.data ? (
        <form className="comment-composer" onSubmit={handleSubmit}>
          <label className="comment-composer__label" htmlFor="idea-comment-body">
            {t('comments.composerLabel')}
          </label>
          <textarea
            id="idea-comment-body"
            className={`comment-composer__textarea${bodyError ? ' comment-composer__textarea--error' : ''}`}
            value={body}
            maxLength={4000}
            rows={4}
            placeholder={t('comments.placeholder')}
            aria-invalid={Boolean(bodyError)}
            aria-describedby="idea-comment-help"
            disabled={createMutation.isPending}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="comment-composer__meta" id="idea-comment-help">
            <span className={bodyError ? 'comment-composer__error' : ''}>
              {bodyError || (createMutation.isError ? t('comments.postError') : t('comments.hint'))}
            </span>
            <span>{t('comments.characters', { count: formattedLength })}</span>
          </div>
          <div className="comment-composer__actions">
            <Button type="submit" disabled={!trimmedBody || createMutation.isPending}>
              {createMutation.isPending ? t('comments.posting') : t('comments.post')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="comments-section__signin">
          <p>{t('comments.signInBody')}</p>
          <Link
            className="button button--secondary"
            to="/login"
            state={{ from: location.pathname }}
          >
            {t('comments.signIn')}
          </Link>
        </div>
      )}

      {deleteMutation.isError && (
        <p className="comments-section__delete-error" role="alert">
          {t('comments.deleteError')}
        </p>
      )}

      {commentsQuery.isPending && (
        <div className="comments-list" role="status" aria-live="polite">
          <span className="sr-only">{t('comments.loading')}</span>
          <CommentSkeleton />
          <CommentSkeleton />
        </div>
      )}

      {commentsQuery.isError && (
        <ErrorState
          title={t('comments.loadErrorTitle')}
          body={t('comments.loadErrorBody')}
          onRetry={() => void commentsQuery.refetch()}
        />
      )}

      {!commentsQuery.isPending && !commentsQuery.isError && comments.length === 0 && (
        <div className="comments-section__empty">
          <strong>{t('comments.emptyTitle')}</strong>
          <p>{t('comments.emptyBody')}</p>
        </div>
      )}

      {comments.length > 0 && (
        <div className="comments-list">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canDelete={comment.author.id === session.data?.id}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === comment.id}
              onDelete={(commentId) => deleteMutation.mutate(commentId)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CommentSkeleton() {
  return (
    <div className="comment-skeleton" aria-hidden="true">
      <span className="idea-skeleton comment-skeleton__author" />
      <span className="idea-skeleton comment-skeleton__line" />
      <span className="idea-skeleton comment-skeleton__line comment-skeleton__line--short" />
    </div>
  )
}
