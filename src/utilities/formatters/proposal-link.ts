const PROPOSAL_BASE_URL_FALLBACK = 'https://nouners.com/proposals'

function getProposalBaseUrl(env?: Env): string {
  const configuredBaseUrl = env?.PROPOSAL_BASE_URL

  return configuredBaseUrl?.trim() || PROPOSAL_BASE_URL_FALLBACK
}

/**
 * Builds a fully qualified link to a specific Nouners proposal.
 * @param proposalId - Identifier of the proposal to link to.
 * @param baseUrl - Optional override for the proposals base url, defaults to nouners.com.
 * @returns A formatted proposal link.
 */
export function formatProposalLink(
  proposalId: number | string,
  baseUrl = PROPOSAL_BASE_URL_FALLBACK,
): string {
  const id = String(proposalId).trim()

  if (!id) {
    throw new Error('Proposal id must be provided to format a link.')
  }

  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

  return `${normalizedBaseUrl}/${id}`
}

export function resolveProposalBaseUrl(env?: Env): string {
  return getProposalBaseUrl(env).replace(/\/$/, '')
}
export { PROPOSAL_BASE_URL_FALLBACK }
