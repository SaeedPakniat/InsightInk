import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Brand } from '../components/ui/Brand'
import { LanguageToggle } from '../components/ui/LanguageToggle'

export function RootLayout() {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <div className="brand-lockup">
            <Brand />
            <span className="brand-tagline">{t('brand.tagline')}</span>
          </div>
          <div className="site-header__actions">
            <Link
              className={`site-header__search-link${location.pathname === '/search' ? ' site-header__search-link--active' : ''}`}
              to="/search"
              aria-label={t('search.headerAction')}
              title={t('search.headerAction')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m15.5 15.5 5 5" />
              </svg>
              <span>{t('search.headerAction')}</span>
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </header>
      <main className="site-main">
        <div className="route-stage" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
