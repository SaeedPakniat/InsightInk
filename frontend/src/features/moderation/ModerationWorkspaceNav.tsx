import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function ModerationWorkspaceNav() {
  const { t } = useTranslation()

  return (
    <nav className="moderation-workspace-nav" aria-label={t('moderation.workspaceNavigation')}>
      <NavLink
        end
        to="/moderation"
        className={({ isActive }) =>
          `moderation-workspace-nav__link${isActive ? ' moderation-workspace-nav__link--active' : ''}`
        }
      >
        {t('moderation.reportsTab')}
      </NavLink>
      <NavLink
        to="/moderation/ideas"
        className={({ isActive }) =>
          `moderation-workspace-nav__link${isActive ? ' moderation-workspace-nav__link--active' : ''}`
        }
      >
        {t('moderation.hiddenIdeasTab')}
      </NavLink>
    </nav>
  )
}
