import { describe, expect, it, vi } from 'vitest'

import { formatProposalLink } from '@/utilities/formatters/proposal-link'
import { buildProposalReminderMessage } from '@/utilities/messages/proposal-reminder'

vi.mock('@/utilities/formatters/proposal-link')

describe('buildProposalReminderMessage', () => {
  it('includes the formatted proposal link and timing information', () => {
    const proposalLink = 'https://nouners.com/proposals/885'

    vi.mocked(formatProposalLink).mockReturnValue(proposalLink)

    const message = buildProposalReminderMessage({
      proposalId: 885,
      startRelative: '2 hours ago',
      endRelative: 'in 12 hours',
    })

    expect(message).toContain(proposalLink)
    expect(message).toContain('Proposal #885')
    expect(message).toContain('Voting started 2 hours ago')
    expect(message).toContain('and wraps up in 12 hours')
    expect(message).toMatch(/Vote now →/) // ensures CTA formatting
  })
})
