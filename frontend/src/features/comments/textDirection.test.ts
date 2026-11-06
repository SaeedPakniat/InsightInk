import { describe, expect, it } from 'vitest'

import { inferTextDirection } from './textDirection'

describe('inferTextDirection', () => {
  it.each([
    ['This starts in English.', 'ltr'],
    ['این نظر فارسی است.', 'rtl'],
    ['هذا تعليق عربي.', 'rtl'],
    ['שלום עולם', 'rtl'],
    ['123 — English after punctuation', 'ltr'],
    ['123 — فارسی بعد از عدد', 'rtl'],
    ['12345', 'ltr'],
  ] as const)('%s -> %s', (text, expected) => {
    expect(inferTextDirection(text)).toBe(expected)
  })
})
