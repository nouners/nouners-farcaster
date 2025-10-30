const PROPOSAL_BASE_URL_FALLBACK = 'https://nouners.com/proposals'

/**
 * Retrieves the configured proposal base URL or falls back to the default.
 * @param env - Optional worker environment containing `PROPOSAL_BASE_URL`.
 * @returns The normalized proposal base URL.
 */
function getProposalBaseUrl(env?: Env): string {
  const configuredBaseUrl = env?.PROPOSAL_BASE_URL
  const trimmedBaseUrl = configuredBaseUrl?.trim()

  if (!trimmedBaseUrl) {
    return PROPOSAL_BASE_URL_FALLBACK
  }

  return trimmedBaseUrl
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

/**
 * Resolves the base proposal URL that should be used for link generation.
 * @param env - Optional worker environment containing `PROPOSAL_BASE_URL`.
 * @returns The sanitized proposal base URL without a trailing slash.
 */
export function resolveProposalBaseUrl(env?: Env): string {
  return getProposalBaseUrl(env).replace(/\/$/, '')
}
export { PROPOSAL_BASE_URL_FALLBACK }
