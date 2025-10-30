import { describe, expect, it } from 'vitest'

import {
  DEFAULT_NOUNERS_BASE_URL,
  formatProposalLink,
} from '@/utilities/formatters/proposal-link'

describe('formatProposalLink', () => {
  it('builds a proposal link using the default base url', () => {
    expect(formatProposalLink(885)).toBe(
      `${DEFAULT_NOUNERS_BASE_URL}/885`,
    )
  })

  it('accepts string ids and trims whitespace', () => {
    expect(formatProposalLink(' 42 ')).toBe(
      `${DEFAULT_NOUNERS_BASE_URL}/42`,
    )
  })

  it('allows overriding the base url', () => {
    expect(formatProposalLink(7, 'https://example.com/proposals')).toBe(
      'https://example.com/proposals/7',
    )
  })

  it('normalizes base url trailing slash', () => {
    expect(formatProposalLink(7, 'https://example.com/proposals/')).toBe(
      'https://example.com/proposals/7',
    )
  })

  it('throws when proposal id is empty', () => {
    // `as unknown as string` to satisfy TypeScript, runtime receives empty string
    expect(() => formatProposalLink('' as unknown as string)).toThrow(
      /must be provided/i,
    )
  })
})
