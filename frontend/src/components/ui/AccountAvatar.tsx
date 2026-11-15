import { getAccountDisplayName, getAccountInitials } from './accountAvatar'

type AccountAvatarProps = {
  avatarUrl?: string | null
  displayName: string
  email: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function AccountAvatar({
  avatarUrl,
  displayName,
  email,
  size = 'medium',
  className = '',
}: AccountAvatarProps) {
  const classes = `account-avatar account-avatar--${size}${className ? ` ${className}` : ''}`
  const accountName = getAccountDisplayName(displayName, email)

  if (avatarUrl) {
    return <img className={classes} src={avatarUrl} alt={accountName} />
  }

  return (
    <span className={classes} aria-hidden="true">
      {getAccountInitials(displayName, email)}
    </span>
  )
}
