import { Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Brand } from '../components/ui/Brand'
import { RouteLoadingScreen } from '../components/ui/Feedback'
import { LanguageToggle } from '../components/ui/LanguageToggle'
import { useSession } from '../features/auth/session'

export function RootLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const session = useSession()

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
            {session.data && (
              <Link
                className={`site-header__studio-link${location.pathname.startsWith('/studio') ? ' site-header__studio-link--active' : ''}`}
                to="/studio"
                aria-label={t('studio.headerAction')}
                title={t('studio.headerAction')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="m4 16.5-.7 4.2 4.2-.7L18.8 8.7a2.1 2.1 0 0 0 0-3l-.5-.5a2.1 2.1 0 0 0-3 0L4 16.5Z" />
                  <path d="m13.8 6.7 3.5 3.5" />
                </svg>
                <span>{t('studio.headerAction')}</span>
              </Link>
            )}
            {session.data?.capabilities.can_moderate && (
              <Link
                className={`site-header__moderation-link${location.pathname.startsWith('/moderation') ? ' site-header__moderation-link--active' : ''}`}
                to="/moderation"
                aria-label={t('moderation.headerAction')}
                title={t('moderation.headerAction')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3.5 18.5 6v5.3c0 4.2-2.7 7.3-6.5 9.2-3.8-1.9-6.5-5-6.5-9.2V6L12 3.5Z" />
                  <path d="m9.2 12 1.8 1.8 3.8-4" />
                </svg>
                <span>{t('moderation.headerAction')}</span>
              </Link>
            )}
            <LanguageToggle />
          </div>
        </div>
      </header>
      <main className="site-main">
        <Suspense fallback={<RouteLoadingScreen />}>
          <div className="route-stage" key={location.pathname}>
            <Outlet />
          </div>
        </Suspense>
      </main>
    </div>
  )
}
