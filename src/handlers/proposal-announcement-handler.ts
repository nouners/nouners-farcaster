import { getBlockNumber } from '@/services/ethereum/get-block-number'
import { getProposals } from '@/services/nouns/get-proposals'
import { publishCast } from '@/services/warpcast'
import {
  formatProposalLink,
  resolveProposalBaseUrl,
} from '@/utilities/formatters/proposal-link'
import { logger } from '@/utilities/logger'
import { ProposalStatus } from '@nekofar/nouns/subgraphs'
import { filter } from 'remeda'

const CAST_EXPIRATION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

/**
 * Posts announcement casts for active proposals whose voting windows are open.
 *
 * Workflow:
 * - Fetches the current block to determine open voting windows.
 * - Skips proposals already broadcast (tracked in KV).
 * - Publishes casts to the nouners channel with deep links to proposals.
 * @param env - Cloudflare worker bindings including KV storage and Warpcast API tokens.
 */
export async function proposalAnnouncementHandler(env: Env) {
  const { KV: kv } = env

  logger.info('Fetching current block number...')
  const blockNumber = await getBlockNumber(env)

  logger.info('Fetching active proposals...')
  let { proposals } = await getProposals(env)

  proposals = filter(
    proposals,
    (proposal) =>
      proposal.status === ProposalStatus.Active &&
      Number(proposal.endBlock) > blockNumber,
  )

  logger.info(
    { activeProposalsCount: proposals.length },
    'Filtered active proposals.',
  )

  if (proposals.length === 0) {
    logger.debug('No active proposals to announce.')
    return
  }

  const proposalBaseUrl = resolveProposalBaseUrl(env)

  for (const proposal of proposals) {
    const proposalId = proposal.id
    const kvKey = `announced:proposal:${proposalId}`

    // Check if we've already announced this proposal
    const storedCastHash = await kv.get(kvKey)

    if (storedCastHash) {
      logger.info(
        { proposalId, castHash: storedCastHash },
        'Proposal already announced, skipping.',
      )
      continue
    }

    // Format the cast message
    const proposalUrl = formatProposalLink(proposalId, proposalBaseUrl)
    const castText = `🗳️ New Nouns proposal is now active!\n\nProposal ${proposalId}: ${proposal.title}\n\nVote now → ${proposalUrl}`

    try {
      logger.info(
        { proposalId, title: proposal.title },
        'Publishing cast for proposal...',
      )

      // Publish the cast to the nouners channel
      const result = await publishCast(
        env,
        castText,
        'nouners',
        [{ url: proposalUrl }],
      )

      logger.info(
        { proposalId, castHash: result.cast.hash },
        'Successfully published cast for proposal.',
      )

      // Save the cast hash for this proposal
      await kv.put(kvKey, result.cast.hash, {
        expirationTtl: CAST_EXPIRATION_TTL_SECONDS,
      })
    } catch (error) {
      logger.error(
        { proposalId, error },
        'Failed to publish cast for proposal.',
      )
    }
  }
}
