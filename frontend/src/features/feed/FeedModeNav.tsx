import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function FeedModeNav() {
  const { t } = useTranslation()

  return (
    <nav className="feed-mode-nav" aria-label={t('feed.navLabel')}>
      <NavLink
        to="/app"
        end
        className={({ isActive }) =>
          `feed-mode-nav__link${isActive ? ' feed-mode-nav__link--active' : ''}`
        }
      >
        {t('feed.forYou')}
      </NavLink>
      <NavLink
        to="/explore"
        className={({ isActive }) =>
          `feed-mode-nav__link${isActive ? ' feed-mode-nav__link--active' : ''}`
        }
      >
        {t('feed.latest')}
      </NavLink>
    </nav>
  )
}
