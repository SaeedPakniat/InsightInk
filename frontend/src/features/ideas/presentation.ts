export function getInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'I'

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const RTL_LANGUAGE_CODES = new Set(['ar', 'fa', 'he', 'ur'])

export function getContentDirection(language: string): 'rtl' | 'ltr' {
  const baseLanguage = language.toLowerCase().split('-')[0]
  return RTL_LANGUAGE_CODES.has(baseLanguage) ? 'rtl' : 'ltr'
}

export function getReadMinutes(estimatedReadSeconds: number) {
  return Math.max(1, Math.ceil(estimatedReadSeconds / 60))
}

export function formatUiNumber(value: number, isEnglishUi: boolean) {
  return new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(value)
}
