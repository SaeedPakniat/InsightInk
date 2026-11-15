import { useEffect, useRef, useState, Suspense } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { updateCurrentUser } from '../api/account'
import { logout } from '../api/auth'
import type { UiLanguage } from '../api/types'
import { AccountAvatar } from '../components/ui/AccountAvatar'
import { getAccountDisplayName } from '../components/ui/accountAvatar'
import { Brand } from '../components/ui/Brand'
import { RouteLoadingScreen } from '../components/ui/Feedback'
import { RouteErrorBoundary } from '../components/ui/RouteErrorBoundary'
import { LanguageToggle } from '../components/ui/LanguageToggle'
import { SESSION_QUERY_KEY, useSession } from '../features/auth/session'
import { RECOMMENDATIONS_QUERY_KEY } from '../features/feed/recommendations'

type NavigationItem = {
  label: string
  to: string
  active: (pathname: string) => boolean
}

export function RootLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)

  const currentUser = session.data
  const isAuthenticated = Boolean(currentUser)
  const navigation: NavigationItem[] = isAuthenticated
    ? [
        { label: t('shell.home'), to: '/app', active: (path) => path === '/app' },
        { label: t('shell.explore'), to: '/explore', active: (path) => path === '/explore' },
        { label: t('shell.search'), to: '/search', active: (path) => path === '/search' },
        { label: t('shell.library'), to: '/library', active: (path) => path === '/library' },
        {
          label: t('shell.studio'),
          to: '/studio',
          active: (path) => path.startsWith('/studio'),
        },
        ...(currentUser?.capabilities.can_moderate
          ? [
              {
                label: t('shell.moderation'),
                to: '/moderation',
                active: (path: string) => path.startsWith('/moderation'),
              },
            ]
          : []),
      ]
    : [
        { label: t('shell.home'), to: '/', active: (path) => path === '/' },
        { label: t('shell.search'), to: '/search', active: (path) => path === '/search' },
      ]

  const languagePreferenceMutation = useMutation({
    mutationFn: (language: UiLanguage) => updateCurrentUser({ preferred_ui_language: language }),
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user)
      void queryClient.invalidateQueries({ queryKey: RECOMMENDATIONS_QUERY_KEY })
    },
  })

  const persistLanguagePreference = async (language: UiLanguage) => {
    await languagePreferenceMutation.mutateAsync(language)
  }

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== SESSION_QUERY_KEY[0],
      })
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      setAccountMenuOpen(false)
      setMobileMenuOpen(false)
      navigate('/', { replace: true })
    },
  })

  useEffect(() => {
    // This effect synchronizes transient disclosure state with router state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false)
    setAccountMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileMenuOpen && !accountMenuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (mobileMenuOpen) mobileMenuButtonRef.current?.focus()
      if (accountMenuOpen) accountButtonRef.current?.focus()
      setMobileMenuOpen(false)
      setAccountMenuOpen(false)
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMobileMenuOpen(false)
        setAccountMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [accountMenuOpen, mobileMenuOpen])

  const closeMenus = () => {
    setMobileMenuOpen(false)
    setAccountMenuOpen(false)
  }

  const navigationLinks = (className: string) =>
    navigation.map((item) => {
      const active = item.active(location.pathname)
      return (
        <Link
          className={`${className}${active ? ` ${className}--active` : ''}`}
          to={item.to}
          aria-current={active ? 'page' : undefined}
          key={item.to}
          onClick={closeMenus}
        >
          <span>{item.label}</span>
          {active && <span className="shell-nav__active-marker" aria-hidden="true" />}
        </Link>
      )
    })

  const signOutButton = (className: string) => (
    <button
      className={className}
      type="button"
      disabled={logoutMutation.isPending}
      onClick={() => logoutMutation.mutate()}
    >
      {logoutMutation.isPending ? t('common.loggingOut') : t('common.logout')}
    </button>
  )

  return (
    <div className="site-shell">
      <header className="site-header" ref={headerRef}>
        <div className="site-header__inner">
          <div className="brand-lockup">
            <Brand />
            <span className="brand-tagline">{t('brand.tagline')}</span>
          </div>

          <nav className="shell-nav shell-nav--desktop" aria-label={t('shell.primaryNavigation')}>
            {navigationLinks('shell-nav__link')}
          </nav>

          <div className="site-header__actions">
            <div className="site-header__language">
              <LanguageToggle
                preferredLanguage={currentUser?.preferred_ui_language}
                onAuthenticatedLanguageChange={currentUser ? persistLanguagePreference : undefined}
              />
            </div>
            {currentUser ? (
              <div className="account-control">
                <button
                  ref={accountButtonRef}
                  className="account-control__trigger"
                  type="button"
                  aria-label={t('shell.openAccountMenu', {
                    name: getAccountDisplayName(currentUser.display_name, currentUser.email),
                  })}
                  aria-expanded={accountMenuOpen}
                  aria-controls="account-menu"
                  onClick={() => {
                    logoutMutation.reset()
                    setMobileMenuOpen(false)
                    setAccountMenuOpen((open) => !open)
                  }}
                >
                  <AccountAvatar
                    avatarUrl={currentUser.avatar_url}
                    displayName={currentUser.display_name}
                    email={currentUser.email}
                    size="small"
                  />
                  <span className="account-control__name">
                    {getAccountDisplayName(currentUser.display_name, currentUser.email)}
                  </span>
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="m4 6 4 4 4-4" />
                  </svg>
                </button>
                {accountMenuOpen && (
                  <div className="account-menu" id="account-menu">
                    <div className="account-menu__identity">
                      <AccountAvatar
                        avatarUrl={currentUser.avatar_url}
                        displayName={currentUser.display_name}
                        email={currentUser.email}
                      />
                      <div>
                        <strong>
                          {getAccountDisplayName(currentUser.display_name, currentUser.email)}
                        </strong>
                        <span>{currentUser.email}</span>
                      </div>
                    </div>
                    <Link className="account-menu__link" to="/account" onClick={closeMenus}>
                      {t('shell.account')}
                    </Link>
                    <Link className="account-menu__link" to="/app" onClick={closeMenus}>
                      {t('shell.home')}
                    </Link>
                    <Link className="account-menu__link" to="/studio" onClick={closeMenus}>
                      {t('shell.studio')}
                    </Link>
                    {logoutMutation.isError && (
                      <p className="account-menu__error" role="alert">
                        {t('shell.logoutError')}
                      </p>
                    )}
                    {signOutButton('account-menu__logout')}
                  </div>
                )}
              </div>
            ) : (
              <div className="shell-auth shell-auth--desktop">
                <Link to="/login">{t('nav.login')}</Link>
                <Link className="shell-auth__primary" to="/register">
                  {t('nav.register')}
                </Link>
              </div>
            )}

            <button
              ref={mobileMenuButtonRef}
              className="mobile-menu-trigger"
              type="button"
              aria-label={mobileMenuOpen ? t('shell.closeMenu') : t('shell.openMenu')}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => {
                logoutMutation.reset()
                setAccountMenuOpen(false)
                setMobileMenuOpen((open) => !open)
              }}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-navigation" id="mobile-navigation">
            <nav className="mobile-navigation__links" aria-label={t('shell.mobileNavigation')}>
              {navigationLinks('mobile-navigation__link')}
            </nav>
            {!currentUser && (
              <div className="mobile-navigation__auth">
                <Link to="/login" onClick={closeMenus}>
                  {t('nav.login')}
                </Link>
                <Link to="/register" onClick={closeMenus}>
                  {t('nav.register')}
                </Link>
              </div>
            )}
            {currentUser && (
              <div className="mobile-navigation__account">
                <div>
                  <strong>
                    {getAccountDisplayName(currentUser.display_name, currentUser.email)}
                  </strong>
                  <span>{currentUser.email}</span>
                </div>
                {logoutMutation.isError && (
                  <p className="account-menu__error" role="alert">
                    {t('shell.logoutError')}
                  </p>
                )}
                {signOutButton('mobile-navigation__logout')}
              </div>
            )}
          </div>
        )}
      </header>
      <main className="site-main">
        <RouteErrorBoundary
          key={`${location.pathname}${location.search}${location.hash}`}
          title={t('errors.routeTitle')}
          body={t('errors.routeBody')}
          reloadLabel={t('errors.reload')}
          homeLabel={t('errors.backHome')}
          homePath={currentUser ? '/app' : '/'}
        >
          <Suspense fallback={<RouteLoadingScreen />}>
            <div className="route-stage">
              <Outlet />
            </div>
          </Suspense>
        </RouteErrorBoundary>
      </main>
    </div>
  )
}
