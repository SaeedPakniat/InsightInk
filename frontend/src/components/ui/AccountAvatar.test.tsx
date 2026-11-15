import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AccountAvatar } from './AccountAvatar'
import { getAccountDisplayName, getAccountInitials } from './accountAvatar'

describe('AccountAvatar', () => {
  it('renders an account image when an avatar URL is available', () => {
    render(
      <AccountAvatar
        avatarUrl="https://media.example/avatar.webp"
        displayName="Mina Reader"
        email="mina@example.com"
      />,
    )

    expect(screen.getByRole('img', { name: 'Mina Reader' })).toHaveAttribute(
      'src',
      'https://media.example/avatar.webp',
    )
  })

  it('derives deterministic two-character initials for English and Persian names', () => {
    expect(getAccountInitials('Mina Reader', 'mina@example.com')).toBe('MR')
    expect(getAccountInitials('مینا رضایی', 'mina@example.com')).toBe('مر')
  })

  it('falls back safely to the email when the display name is blank', () => {
    expect(getAccountDisplayName('   ', 'reader@example.com')).toBe('reader')
    expect(getAccountInitials('   ', 'reader@example.com')).toBe('RE')

    render(<AccountAvatar displayName="  " email="reader@example.com" />)
    expect(screen.getByText('RE')).toBeInTheDocument()
  })
})
