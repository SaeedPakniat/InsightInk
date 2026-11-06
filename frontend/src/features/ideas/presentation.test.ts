import { describe, expect, it } from 'vitest'

import { getContentDirection } from './presentation'

describe('getContentDirection', () => {
  it.each([
    ['fa', 'rtl'],
    ['ar', 'rtl'],
    ['he', 'rtl'],
    ['ur', 'rtl'],
    ['ar-SA', 'rtl'],
    ['en', 'ltr'],
    ['es', 'ltr'],
    ['ja', 'ltr'],
    ['zh-Hans', 'ltr'],
  ] as const)('%s -> %s', (language, expected) => {
    expect(getContentDirection(language)).toBe(expected)
  })
})
