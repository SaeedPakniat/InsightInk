import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <section className="not-found">
      <p className="eyebrow">404</p>
      <h1>{t('errors.pageNotFound')}</h1>
      <Link className="button button--secondary" to="/">
        {t('errors.backHome')}
      </Link>
    </section>
  )
}
