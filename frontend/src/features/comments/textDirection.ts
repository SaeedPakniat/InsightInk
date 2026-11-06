const RTL_SCRIPT_PATTERN = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/
const LETTER_PATTERN = /\p{L}/u

export function inferTextDirection(text: string): 'rtl' | 'ltr' {
  for (const character of text) {
    if (RTL_SCRIPT_PATTERN.test(character)) return 'rtl'
    if (LETTER_PATTERN.test(character)) return 'ltr'
  }

  return 'ltr'
}
