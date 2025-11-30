/**
 * Builds the text for a proposal announcement cast.
 * @param params - The parameters for building the message.
 * @param params.proposalId - The ID of the proposal.
 * @param params.title - The title of the proposal.
 * @param params.link - The URL link to the proposal.
 * @returns The formatted announcement message.
 */
export function buildProposalAnnouncementMessage(params: {
  proposalId: string
  title: string
  link: string
}): string {
  const { proposalId, title, link } = params
  return `🗳️ New Nouns proposal is now active!\n\nProposal ${proposalId}: ${title}\n\nVote now → ${link}`
}
