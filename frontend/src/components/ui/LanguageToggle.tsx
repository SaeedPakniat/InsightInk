import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import type { UiLanguage } from '../../api/types'
import { changeUiLanguage } from '../../i18n'

const LANGUAGE_SWITCH_DELAY_MS = 340
const LANGUAGE_MORPH_DURATION_MS = 900

type LanguageToggleProps = {
  preferredLanguage?: UiLanguage
  onAuthenticatedLanguageChange?: (language: UiLanguage) => Promise<void>
}

type FlowDirection = 'to-ltr' | 'to-rtl'

type MorphState = {
  direction: FlowDirection
  targetLanguage: UiLanguage
}

type MorphTileStyle = CSSProperties & {
  '--tile-x': string
  '--tile-y': string
  '--tile-delay': string
  '--tile-rotate': string
}

const ENGLISH_TILES = [
  'A',
  'B',
  'IDEA',
  'C',
  'READ',
  'D',
  'BOOK',
  'E',
  'SAVE',
  'F',
  'THINK',
  'G',
  'INK',
  'H',
]
const PERSIAN_TILES = [
  'ا',
  'ب',
  'ایده',
  'پ',
  'بخوان',
  'ت',
  'کتاب',
  'ث',
  'ذخیره',
  'ج',
  'فکر',
  'چ',
  'جوهر',
  'ح',
]

const TILE_LAYOUT = [
  [11, 17, -7],
  [28, 12, 5],
  [48, 19, -3],
  [72, 13, 7],
  [86, 27, -5],
  [18, 34, 6],
  [39, 30, -4],
  [61, 37, 4],
  [80, 43, -6],
  [15, 56, 5],
  [34, 65, -4],
  [58, 58, 6],
  [77, 69, -3],
  [90, 55, 5],
] as const

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function removeMorphClasses() {
  document.documentElement.classList.remove('language-morph-active', 'language-morph-settling')
}

export function LanguageToggle({
  preferredLanguage,
  onAuthenticatedLanguageChange,
}: LanguageToggleProps = {}) {
  const { i18n, t } = useTranslation()
  const [morph, setMorph] = useState<MorphState | null>(null)
  const [persisting, setPersisting] = useState(false)
  const [syncError, setSyncError] = useState(false)
  const switchTimer = useRef<number | null>(null)
  const finishTimer = useRef<number | null>(null)
  const locallyPersistedLanguage = useRef<UiLanguage | null>(null)

  const activeLanguage: UiLanguage = i18n.language.startsWith('en') ? 'en' : 'fa'
  const busy = Boolean(morph) || persisting

  useEffect(() => {
    return () => {
      if (switchTimer.current !== null) window.clearTimeout(switchTimer.current)
      if (finishTimer.current !== null) window.clearTimeout(finishTimer.current)
      removeMorphClasses()
    }
  }, [])

  useEffect(() => {
    if (!preferredLanguage || busy) return

    if (preferredLanguage === activeLanguage) {
      if (locallyPersistedLanguage.current === preferredLanguage) {
        locallyPersistedLanguage.current = null
      }
      return
    }

    if (locallyPersistedLanguage.current === activeLanguage) return
    void changeUiLanguage(preferredLanguage)
  }, [activeLanguage, busy, preferredLanguage])

  const applyLanguage = async (language: UiLanguage, previousLanguage: UiLanguage) => {
    setSyncError(false)

    if (!onAuthenticatedLanguageChange) {
      await changeUiLanguage(language)
      return
    }

    setPersisting(true)
    await changeUiLanguage(language)

    try {
      await onAuthenticatedLanguageChange(language)
      locallyPersistedLanguage.current = language
    } catch {
      locallyPersistedLanguage.current = null
      await changeUiLanguage(previousLanguage)
      setSyncError(true)
    } finally {
      setPersisting(false)
    }
  }

  const selectLanguage = (language: UiLanguage) => {
    if (language === activeLanguage || busy) return

    setSyncError(false)

    if (prefersReducedMotion()) {
      void applyLanguage(language, activeLanguage)
      return
    }

    const nextMorph: MorphState = {
      direction: language === 'en' ? 'to-ltr' : 'to-rtl',
      targetLanguage: language,
    }

    document.documentElement.classList.add('language-morph-active')
    setMorph(nextMorph)

    switchTimer.current = window.setTimeout(() => {
      void applyLanguage(language, activeLanguage)
      document.documentElement.classList.add('language-morph-settling')
    }, LANGUAGE_SWITCH_DELAY_MS)

    finishTimer.current = window.setTimeout(() => {
      removeMorphClasses()
      setMorph(null)
    }, LANGUAGE_MORPH_DURATION_MS)
  }

  const tiles = morph?.targetLanguage === 'en' ? ENGLISH_TILES : PERSIAN_TILES

  return (
    <>
      <div className="language-control">
        <div
          className="language-toggle"
          role="group"
          aria-label={t('language.label')}
          aria-busy={busy ? true : undefined}
        >
          <button
            type="button"
            aria-pressed={activeLanguage === 'fa'}
            disabled={busy}
            onClick={() => selectLanguage('fa')}
          >
            {t('language.persian')}
          </button>
          <button
            type="button"
            aria-pressed={activeLanguage === 'en'}
            disabled={busy}
            onClick={() => selectLanguage('en')}
          >
            {t('language.english')}
          </button>
        </div>

        {syncError && (
          <span className="language-control__error" role="alert">
            {t('language.updateError')}
          </span>
        )}
      </div>

      {morph && (
        <div
          className={`language-morph language-morph--${morph.direction}`}
          aria-hidden="true"
          data-testid="language-morph"
        >
          <div className="language-morph__veil" />
          <div className="language-morph__rail" />
          <div className="language-morph__tiles">
            {tiles.map((tile, index) => {
              const [x, y, rotate] = TILE_LAYOUT[index]
              const style: MorphTileStyle = {
                '--tile-x': `${x}%`,
                '--tile-y': `${y}%`,
                '--tile-delay': `${index * 14}ms`,
                '--tile-rotate': `${rotate}deg`,
              }

              return (
                <span
                  className={`language-morph__tile ${tile.length > 1 ? 'language-morph__tile--word' : ''}`}
                  key={`${morph.targetLanguage}-${tile}-${index}`}
                  style={style}
                >
                  {tile}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
