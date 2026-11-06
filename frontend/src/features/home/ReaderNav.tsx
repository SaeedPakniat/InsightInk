import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function ReaderNav() {
  const { t } = useTranslation()

  return (
    <nav className="feed-mode-nav" aria-label={t('readerNav.label')}>
      <NavLink
        to="/app"
        end
        className={({ isActive }) =>
          `feed-mode-nav__link${isActive ? ' feed-mode-nav__link--active' : ''}`
        }
      >
        {t('readerNav.forYou')}
      </NavLink>
      <NavLink
        to="/explore"
        className={({ isActive }) =>
          `feed-mode-nav__link${isActive ? ' feed-mode-nav__link--active' : ''}`
        }
      >
        {t('readerNav.latest')}
      </NavLink>
      <NavLink
        to="/library"
        className={({ isActive }) =>
          `feed-mode-nav__link${isActive ? ' feed-mode-nav__link--active' : ''}`
        }
      >
        {t('readerNav.library')}
      </NavLink>
    </nav>
  )
}
