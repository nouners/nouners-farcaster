const DEFAULT_NOUNERS_BASE_URL = 'https://nouners.com/proposals'

/**
 * Builds a fully qualified link to a specific Nouners proposal.
 * @param proposalId - Identifier of the proposal to link to.
 * @param baseUrl - Optional override for the proposals base url, defaults to nouners.com.
 * @returns A formatted proposal link.
 */
export function formatProposalLink(
  proposalId: number | string,
  baseUrl = DEFAULT_NOUNERS_BASE_URL,
): string {
  const id = String(proposalId).trim()

  if (!id) {
    throw new Error('Proposal id must be provided to format a link.')
  }

  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

  return `${normalizedBaseUrl}/${id}`
}

export { DEFAULT_NOUNERS_BASE_URL }
