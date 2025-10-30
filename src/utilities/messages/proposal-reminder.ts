interface ProposalReminderMessageParams {
  proposalId: number | string
  startRelative: string
  endRelative: string
  link: string
}

/**
 * Creates the reminder message sent to voters for an active proposal.
 * @param params - Timing and identifier details for the proposal.
 * @returns A formatted reminder message including a proposal link.
 */
export function buildProposalReminderMessage(
  params: ProposalReminderMessageParams,
): string {
  const { proposalId, startRelative, endRelative, link } = params

  return (
    "🗳️ It's voting time, Nouns fam! Proposal #" +
    proposalId.toString() +
    ' is live and ready for your voice. ' +
    'Voting started ' +
    startRelative +
    ' and wraps up ' +
    endRelative +
    '. ' +
    "You received this message because you haven't voted yet. Don't miss out, cast your vote now! 🌟 " +
    'Vote now → ' +
    link
  )
}

export type { ProposalReminderMessageParams }
