import { afterEach, describe, expect, it } from 'vitest'

import { changeUiLanguage } from './index'

describe('UI language direction', () => {
  afterEach(async () => {
    await changeUiLanguage('fa')
  })

  it('switches English to LTR and persists the choice', async () => {
    await changeUiLanguage('en')

    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(window.localStorage.getItem('insightink.uiLanguage')).toBe('en')
  })

  it('switches Persian to RTL', async () => {
    await changeUiLanguage('fa')

    expect(document.documentElement.lang).toBe('fa')
    expect(document.documentElement.dir).toBe('rtl')
  })
})
