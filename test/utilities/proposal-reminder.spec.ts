import { describe, expect, it } from 'vitest'
import { buildProposalReminderMessage } from '@/utilities/messages/proposal-reminder'

describe('buildProposalReminderMessage', () => {
  it('includes the formatted proposal link and timing information', () => {
    const proposalLink = 'https://nouners.com/proposals/885'

    const message = buildProposalReminderMessage({
      proposalId: 885,
      startRelative: '2 hours ago',
      endRelative: 'in 12 hours',
      link: proposalLink,
    })

    expect(message).toContain(proposalLink)
    expect(message).toContain('Proposal #885')
    expect(message).toContain('Voting started 2 hours ago')
    expect(message).toContain('and wraps up in 12 hours')
    expect(message).toMatch(/Vote now →/) // ensures CTA formatting
  })
})
