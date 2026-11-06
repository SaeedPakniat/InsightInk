import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useSession } from '../auth/session'

export function LandingPage() {
  const { t } = useTranslation()
  const session = useSession()

  return (
    <section className="landing">
      <div className="landing__copy">
        <p className="eyebrow">{t('landing.eyebrow')}</p>
        <h1>{t('landing.title')}</h1>
        <p className="landing__lead">{t('landing.body')}</p>

        <div className="landing__actions">
          {session.data ? (
            <Link className="button button--primary" to="/app">
              {t('landing.openApp')}
            </Link>
          ) : (
            <>
              <Link className="button button--primary" to="/register">
                {t('landing.start')}
              </Link>
              <Link className="button button--secondary" to="/login">
                {t('landing.signIn')}
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="landing__principles" aria-label={t('landing.eyebrow')}>
        {[
          ['01', t('landing.pointOneTitle'), t('landing.pointOneBody')],
          ['02', t('landing.pointTwoTitle'), t('landing.pointTwoBody')],
          ['03', t('landing.pointThreeTitle'), t('landing.pointThreeBody')],
        ].map(([number, title, body]) => (
          <article className="principle" key={number}>
            <span className="principle__number">{number}</span>
            <div>
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
