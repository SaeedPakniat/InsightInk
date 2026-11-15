export function getAccountDisplayName(displayName: string, email: string) {
  const normalizedName = displayName.trim()
  if (normalizedName) return normalizedName

  const emailName = email.split('@')[0]?.trim()
  return emailName || email.trim() || '?'
}

export function getAccountInitials(displayName: string, email: string) {
  const label = getAccountDisplayName(displayName, email)
  const words = label.split(/\s+/u).filter(Boolean)

  if (words.length > 1) {
    return `${Array.from(words[0])[0] ?? ''}${Array.from(words.at(-1) ?? '')[0] ?? ''}`.toLocaleUpperCase()
  }

  return Array.from(words[0] ?? '?')
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase()
}
