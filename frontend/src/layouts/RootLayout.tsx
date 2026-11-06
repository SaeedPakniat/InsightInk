import { Outlet, useLocation } from 'react-router-dom'
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
          <LanguageToggle />
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
