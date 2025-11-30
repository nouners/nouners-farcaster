/**
 * Builds the text for a proposal announcement cast.
 * @param params Parameters for building the message.
 * @param params.proposalId Proposal ID.
 * @param params.title Proposal title.
 * @param params.link URL to the proposal.
 * @returns The formatted announcement message.
 */
export function buildProposalAnnouncementMessage(params: {
  proposalId: string
  title: string
  link: string
}): string {
  const { proposalId, title, link } = params

  return [
    '🗳️ Voting is live for a new Nounish decision',
    '',
    `Proposal ${proposalId}: ${title}`,
    '',
    `Take a look and cast your vote → ${link}`
  ].join('\n')
}
