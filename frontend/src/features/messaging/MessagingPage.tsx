import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { ApiError, firstFieldError } from '../../api/client'
import { markConversationRead, sendMessage } from '../../api/messaging'
import type { Conversation, DirectMessage } from '../../api/types'
import { AccountAvatar } from '../../components/ui/AccountAvatar'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/Feedback'
import { useSession } from '../auth/session'
import { MessageReportAction } from './MessageReportAction'
import { useMessagingRealtimeStatus } from './messagingRealtimeContext'
import {
  appendMessageToCache,
  CONVERSATIONS_QUERY_KEY,
  conversationMessagesQueryKey,
  flattenConversations,
  flattenMessages,
  markConversationReadInCache,
  useConversationMessages,
  useConversations,
} from './messagingQueries'

const MAX_MESSAGE_LENGTH = 4000

type ConversationParticipant = {
  displayName: string
  avatarUrl: string | null
  creatorId: number | null
  verified: boolean
}

function conversationParticipant(conversation: Conversation): ConversationParticipant {
  if (conversation.viewer_role === 'reader') {
    return {
      displayName: conversation.creator.display_name,
      avatarUrl: conversation.creator.account_avatar_url || conversation.creator.avatar || null,
      creatorId: conversation.creator.id,
      verified: conversation.creator.is_verified,
    }
  }

  return {
    displayName: conversation.reader.display_name,
    avatarUrl: conversation.reader.avatar_url,
    creatorId: null,
    verified: false,
  }
}

function formatMessageTime(value: string | null, isEnglishUi: boolean) {
  if (!value) return ''
  return new Intl.DateTimeFormat(isEnglishUi ? 'en' : 'fa', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function MessagingPage() {
  const { conversationId: conversationIdParam } = useParams()
  const { i18n, t } = useTranslation()
  const session = useSession()
  const realtime = useMessagingRealtimeStatus()
  const isEnglishUi = i18n.language.startsWith('en')
  const selectedId = conversationIdParam ? Number(conversationIdParam) : null
  const validSelectedId = selectedId === null || (Number.isInteger(selectedId) && selectedId > 0)

  const conversationsQuery = useConversations(Boolean(session.data))
  const conversations = conversationsQuery.data
    ? flattenConversations(conversationsQuery.data.pages)
    : []
  const selectedConversation =
    selectedId === null
      ? null
      : (conversations.find((conversation) => conversation.id === selectedId) ?? null)
  const hasNextConversationPage = conversationsQuery.hasNextPage
  const isFetchingNextConversationPage = conversationsQuery.isFetchingNextPage
  const fetchNextConversationPage = conversationsQuery.fetchNextPage

  useEffect(() => {
    if (
      selectedId &&
      !selectedConversation &&
      hasNextConversationPage &&
      !isFetchingNextConversationPage
    ) {
      void fetchNextConversationPage()
    }
  }, [
    fetchNextConversationPage,
    hasNextConversationPage,
    isFetchingNextConversationPage,
    selectedConversation,
    selectedId,
  ])

  if (!validSelectedId) {
    return (
      <section className="messaging-page">
        <div className="messaging-page__rail">
          <ErrorState title={t('messaging.notFoundTitle')} body={t('messaging.notFoundBody')} />
        </div>
      </section>
    )
  }

  return (
    <section
      className={`messaging-page${selectedId ? ' messaging-page--selected' : ''}`}
      aria-labelledby="messaging-page-title"
    >
      <div className="messaging-page__rail">
        <header className="messaging-page__header">
          <div>
            <p className="eyebrow">{t('messaging.eyebrow')}</p>
            <h1 id="messaging-page-title">{t('messaging.title')}</h1>
            <p>{t('messaging.body')}</p>
          </div>
          <RealtimeStatus status={realtime.status} />
        </header>

        <div className="messaging-workspace">
          <aside className="messaging-conversations" aria-label={t('messaging.conversationList')}>
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              isEnglishUi={isEnglishUi}
              isPending={conversationsQuery.isPending}
              isError={conversationsQuery.isError}
              hasNextPage={Boolean(conversationsQuery.hasNextPage)}
              isFetchingNextPage={conversationsQuery.isFetchingNextPage}
              onRetry={() => void conversationsQuery.refetch()}
              onLoadMore={() => void conversationsQuery.fetchNextPage()}
            />
          </aside>

          <div className="messaging-thread">
            {selectedId ? (
              <ConversationThread
                conversationId={selectedId}
                conversation={selectedConversation}
                isLookingUpConversation={
                  !selectedConversation &&
                  (conversationsQuery.isPending ||
                    conversationsQuery.isFetchingNextPage ||
                    Boolean(conversationsQuery.hasNextPage))
                }
                isEnglishUi={isEnglishUi}
              />
            ) : (
              <div className="messaging-thread__placeholder">
                <span aria-hidden="true">✦</span>
                <strong>{t('messaging.chooseConversationTitle')}</strong>
                <p>{t('messaging.chooseConversationBody')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function RealtimeStatus({
  status,
}: {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
}) {
  const { t } = useTranslation()

  return (
    <div className={`messaging-realtime messaging-realtime--${status}`} role="status">
      <span aria-hidden="true" />
      <span>{t(`messaging.realtime.${status}`)}</span>
    </div>
  )
}

function ConversationList({
  conversations,
  selectedId,
  isEnglishUi,
  isPending,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onRetry,
  onLoadMore,
}: {
  conversations: Conversation[]
  selectedId: number | null
  isEnglishUi: boolean
  isPending: boolean
  isError: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onRetry: () => void
  onLoadMore: () => void
}) {
  const { t } = useTranslation()

  if (isPending) {
    return (
      <div className="messaging-conversations__state" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>{t('messaging.loadingConversations')}</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="messaging-conversations__state" role="alert">
        <strong>{t('messaging.conversationsErrorTitle')}</strong>
        <p>{t('messaging.conversationsErrorBody')}</p>
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="messaging-conversations__state messaging-conversations__state--empty">
        <span aria-hidden="true">◇</span>
        <strong>{t('messaging.emptyConversationsTitle')}</strong>
        <p>{t('messaging.emptyConversationsBody')}</p>
        <Link className="button button--secondary" to="/search">
          {t('messaging.findCreators')}
        </Link>
      </div>
    )
  }

  return (
    <>
      <ol className="conversation-list">
        {conversations.map((conversation) => {
          const participant = conversationParticipant(conversation)
          const active = conversation.id === selectedId
          const unread = conversation.unread_count > 0
          const time = formatMessageTime(
            conversation.last_message?.created_at ?? conversation.updated_at,
            isEnglishUi,
          )

          return (
            <li key={conversation.id}>
              <Link
                className={`conversation-list__item${active ? ' conversation-list__item--active' : ''}${unread ? ' conversation-list__item--unread' : ''}`}
                to={`/messages/${conversation.id}`}
                aria-current={active ? 'page' : undefined}
              >
                <AccountAvatar
                  avatarUrl={participant.avatarUrl}
                  displayName={participant.displayName}
                  email=""
                  size="medium"
                  className="conversation-list__avatar"
                />
                <span className="conversation-list__copy">
                  <span className="conversation-list__heading">
                    <strong dir="auto">{participant.displayName}</strong>
                    <time
                      dateTime={conversation.last_message?.created_at ?? conversation.updated_at}
                    >
                      {time}
                    </time>
                  </span>
                  <span className="conversation-list__preview" dir="auto">
                    {conversation.last_message?.body_excerpt || t('messaging.noMessagesPreview')}
                  </span>
                </span>
                {unread && (
                  <span
                    className="conversation-list__unread"
                    aria-label={t('messaging.unreadCount', {
                      count: conversation.unread_count,
                    })}
                  >
                    {new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(
                      conversation.unread_count,
                    )}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ol>

      {hasNextPage && (
        <div className="messaging-conversations__more">
          <Button variant="ghost" disabled={isFetchingNextPage} onClick={onLoadMore}>
            {isFetchingNextPage
              ? t('messaging.loadingMoreConversations')
              : t('messaging.loadMoreConversations')}
          </Button>
        </div>
      )}
    </>
  )
}

function ConversationThread({
  conversationId,
  conversation,
  isLookingUpConversation,
  isEnglishUi,
}: {
  conversationId: number
  conversation: Conversation | null
  isLookingUpConversation: boolean
  isEnglishUi: boolean
}) {
  const { t } = useTranslation()
  const session = useSession()
  const queryClient = useQueryClient()
  const messagesQuery = useConversationMessages(conversationId)
  const messages = messagesQuery.data ? flattenMessages(messagesQuery.data.pages) : []
  const participant = conversation ? conversationParticipant(conversation) : null
  const [body, setBody] = useState('')
  const lastReadAttempt = useRef<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const readMutation = useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: async (result) => {
      markConversationReadInCache(queryClient, conversationId, result.read_at)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: conversationMessagesQueryKey(conversationId),
        }),
      ])
    },
  })

  const sendMutation = useMutation({
    mutationFn: (messageBody: string) => sendMessage(conversationId, messageBody),
    onSuccess: async (message) => {
      appendMessageToCache(queryClient, conversationId, message)
      setBody('')
      await queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
      window.requestAnimationFrame(() => {
        endRef.current?.scrollIntoView?.({ block: 'end' })
      })
    },
  })

  const unreadKey =
    conversation && conversation.unread_count > 0
      ? `${conversation.id}:${conversation.unread_count}:${conversation.last_message?.id ?? 0}`
      : null

  const markReadPending = readMutation.isPending
  const markRead = readMutation.mutate

  useEffect(() => {
    if (!unreadKey || markReadPending || lastReadAttempt.current === unreadKey) return
    lastReadAttempt.current = unreadKey
    markRead()
  }, [markRead, markReadPending, unreadKey])

  const bodyError = firstFieldError(sendMutation.error, 'body')
  const trimmedBody = body.trim()
  const overLimit = body.length > MAX_MESSAGE_LENGTH
  const canSend = Boolean(trimmedBody) && !overLimit && !sendMutation.isPending
  const numberFormatter = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSend) return
    sendMutation.mutate(trimmedBody)
  }

  if (messagesQuery.isPending || isLookingUpConversation) {
    return (
      <div className="messaging-thread__state" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>{t('messaging.loadingMessages')}</span>
      </div>
    )
  }

  if (messagesQuery.isError) {
    const notFound = messagesQuery.error instanceof ApiError && messagesQuery.error.status === 404
    return (
      <div className="messaging-thread__state" role="alert">
        <strong>
          {notFound ? t('messaging.notFoundTitle') : t('messaging.messagesErrorTitle')}
        </strong>
        <p>{notFound ? t('messaging.notFoundBody') : t('messaging.messagesErrorBody')}</p>
        {!notFound && (
          <Button variant="secondary" onClick={() => void messagesQuery.refetch()}>
            {t('common.retry')}
          </Button>
        )}
        <Link className="button button--ghost" to="/messages">
          {t('messaging.backToConversations')}
        </Link>
      </div>
    )
  }

  if (!conversation || !participant || !session.data) {
    return (
      <div className="messaging-thread__state" role="alert">
        <strong>{t('messaging.notFoundTitle')}</strong>
        <p>{t('messaging.notFoundBody')}</p>
        <Link className="button button--secondary" to="/messages">
          {t('messaging.backToConversations')}
        </Link>
      </div>
    )
  }

  const currentUserId = session.data.id

  return (
    <article className="conversation-thread" aria-labelledby="conversation-thread-title">
      <header className="conversation-thread__header">
        <Link className="conversation-thread__back" to="/messages">
          {t('messaging.backToConversations')}
        </Link>
        <div className="conversation-thread__identity">
          <AccountAvatar
            avatarUrl={participant.avatarUrl}
            displayName={participant.displayName}
            email=""
            size="medium"
          />
          <div>
            <h2 id="conversation-thread-title" dir="auto">
              {participant.displayName}
            </h2>
            <span>
              {conversation.viewer_role === 'reader'
                ? t('messaging.creatorParticipant')
                : t('messaging.readerParticipant')}
              {participant.verified ? ` · ${t('creator.verified')}` : ''}
            </span>
          </div>
        </div>
        {participant.creatorId && (
          <Link className="conversation-thread__profile" to={`/creators/${participant.creatorId}`}>
            {t('messaging.viewCreator')}
          </Link>
        )}
      </header>

      {readMutation.isError && (
        <div className="conversation-thread__read-error" role="alert">
          <span>{t('messaging.readError')}</span>
          <button
            type="button"
            onClick={() => {
              if (!unreadKey) return
              readMutation.reset()
              lastReadAttempt.current = unreadKey
              markRead()
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      <div className="conversation-thread__history">
        {messagesQuery.hasNextPage && (
          <div className="conversation-thread__older">
            <Button
              variant="ghost"
              disabled={messagesQuery.isFetchingNextPage}
              onClick={() => void messagesQuery.fetchNextPage()}
            >
              {messagesQuery.isFetchingNextPage
                ? t('messaging.loadingOlderMessages')
                : t('messaging.loadOlderMessages')}
            </Button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="conversation-thread__empty">
            <span aria-hidden="true">◇</span>
            <strong>{t('messaging.emptyThreadTitle')}</strong>
            <p>{t('messaging.emptyThreadBody')}</p>
          </div>
        ) : (
          <ol className="message-list" aria-label={t('messaging.messageHistory')}>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                isEnglishUi={isEnglishUi}
              />
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <form className="message-composer" onSubmit={handleSubmit}>
        <label htmlFor="direct-message-body">{t('messaging.composeLabel')}</label>
        <textarea
          id="direct-message-body"
          value={body}
          rows={3}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={sendMutation.isPending}
          placeholder={t('messaging.composePlaceholder')}
          aria-invalid={Boolean(bodyError || overLimit)}
          onChange={(event) => {
            setBody(event.target.value)
            sendMutation.reset()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              if (canSend) sendMutation.mutate(trimmedBody)
            }
          }}
        />
        <div className="message-composer__meta">
          <span>
            {t('messaging.messageCount', {
              count: numberFormatter.format(body.length),
              max: numberFormatter.format(MAX_MESSAGE_LENGTH),
            })}
          </span>
          {(bodyError || overLimit) && (
            <span className="message-composer__error" role="alert">
              {bodyError || t('messaging.messageTooLong')}
            </span>
          )}
          {sendMutation.isError && !bodyError && !overLimit && (
            <span className="message-composer__error" role="alert">
              {t('messaging.sendError')}
            </span>
          )}
        </div>
        <div className="message-composer__actions">
          <Button type="submit" disabled={!canSend}>
            {sendMutation.isPending ? t('messaging.sending') : t('messaging.send')}
          </Button>
          <span>{t('messaging.sendHint')}</span>
        </div>
      </form>
    </article>
  )
}

function MessageBubble({
  message,
  currentUserId,
  isEnglishUi,
}: {
  message: DirectMessage
  currentUserId: number
  isEnglishUi: boolean
}) {
  const { t } = useTranslation()
  const mine = message.sender.id === currentUserId
  const time = formatMessageTime(message.created_at, isEnglishUi)

  return (
    <li className={`message-bubble${mine ? ' message-bubble--mine' : ' message-bubble--theirs'}`}>
      <div className="message-bubble__surface">
        {!mine && (
          <strong className="message-bubble__sender" dir="auto">
            {message.sender.display_name}
          </strong>
        )}
        <p dir="auto">{message.body}</p>
        <div className="message-bubble__meta">
          <time dateTime={message.created_at}>{time}</time>
          {mine && <span>{message.is_read ? t('messaging.read') : t('messaging.sent')}</span>}
        </div>
      </div>
      {!mine && <MessageReportAction messageId={message.id} />}
    </li>
  )
}
