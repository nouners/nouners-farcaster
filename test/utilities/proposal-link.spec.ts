import { describe, expect, it } from 'vitest'

import {
  PROPOSAL_BASE_URL_FALLBACK,
  formatProposalLink,
  resolveProposalBaseUrl,
} from '@/utilities/formatters/proposal-link'

describe('formatProposalLink', () => {
  it('builds a proposal link using the default base url', () => {
    expect(formatProposalLink(885)).toBe(
      `${PROPOSAL_BASE_URL_FALLBACK}/885`,
    )
  })

  it('accepts string ids and trims whitespace', () => {
    expect(formatProposalLink(' 42 ')).toBe(
      `${PROPOSAL_BASE_URL_FALLBACK}/42`,
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

  it('resolves the base url from env when available', () => {
    expect(
      resolveProposalBaseUrl({
        PROPOSAL_BASE_URL: 'https://example.com/proposals',
      } as Env),
    ).toBe('https://example.com/proposals')
  })

  it('falls back to default when env missing', () => {
    expect(resolveProposalBaseUrl()).toBe(PROPOSAL_BASE_URL_FALLBACK)
  })

  it('removes trailing slash from env defined base url', () => {
    expect(
      resolveProposalBaseUrl({
        PROPOSAL_BASE_URL: 'https://example.com/proposals/',
      } as Env),
    ).toBe('https://example.com/proposals')
  })
})
