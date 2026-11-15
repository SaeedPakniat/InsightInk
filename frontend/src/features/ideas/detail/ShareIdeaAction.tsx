import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type ShareState = 'copied' | 'shared' | 'error' | null

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    if (!document.execCommand('copy')) {
      throw new Error('Copy command was not accepted.')
    }
  } finally {
    textarea.remove()
  }
}

function canonicalIdeaUrl(ideaId: number) {
  return new URL(`/ideas/${ideaId}`, window.location.origin).toString()
}

export function ShareIdeaAction({ ideaId, title }: { ideaId: number; title: string }) {
  const { t } = useTranslation()
  const [state, setState] = useState<ShareState>(null)
  const [busy, setBusy] = useState(false)

  const handleShare = async () => {
    const url = canonicalIdeaUrl(ideaId)
    setState(null)
    setBusy(true)

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title,
          text: t('idea.shareText', { title }),
          url,
        })
        setState('shared')
      } else {
        await copyText(url)
        setState('copied')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setState(null)
      } else {
        setState('error')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="idea-share-action">
      <button
        className="idea-engagement__button idea-share-action__button"
        type="button"
        disabled={busy}
        onClick={() => void handleShare()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
        </svg>
        <span>{busy ? t('idea.sharing') : t('idea.share')}</span>
      </button>

      {state === 'copied' && (
        <span className="idea-share-action__status" role="status" aria-live="polite">
          {t('idea.shareCopied')}
        </span>
      )}
      {state === 'shared' && (
        <span className="idea-share-action__status" role="status" aria-live="polite">
          {t('idea.shareComplete')}
        </span>
      )}
      {state === 'error' && (
        <span className="idea-share-action__error" role="alert">
          {t('idea.shareError')}
        </span>
      )}
    </div>
  )
}
