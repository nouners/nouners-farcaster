import { getBlockNumber } from '@/services/ethereum/get-block-number'
import { getProposals } from '@/services/nouns/get-proposals'
import {
  formatProposalLink,
  resolveProposalBaseUrl,
} from '@/utilities/formatters/proposal-link'
import { logger } from '@/utilities/logger'
import { buildProposalAnnouncementMessage } from '@/utilities/messages/proposal-announcement'
import { ProposalStatus } from '@nekofar/nouns/subgraphs'
import { createCast } from '@nekofar/warpcast'
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
    const castText = buildProposalAnnouncementMessage({
      proposalId,
      title: proposal.title,
      link: proposalUrl,
    })

    logger.debug({ proposalId, castText }, 'Built cast message for proposal.')

    try {
      logger.info(
        { proposalId, title: proposal.title },
        'Publishing cast for proposal...',
      )

      // Publish the cast to the nouners channel
      const { data, error } = await createCast({
        body: {
          text: castText,
          channelKey: 'nouners',
          embeds: [proposalUrl],
        },
        auth: () => env.WARPCAST_ACCESS_TOKEN,
      })

      if (error) {
        throw error instanceof Error ? error : new Error(JSON.stringify(error))
      }

      logger.info(
        { proposalId, castHash: data.result?.cast?.hash },
        'Successfully published cast for proposal.',
      )

      // Save the cast hash for this proposal
      await kv.put(kvKey, data.result?.cast?.hash ?? '', {
        expirationTtl: CAST_EXPIRATION_TTL_SECONDS,
      })
    } catch (error) {
      logger.error(
        {
          proposalId,
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack, name: error.name }
              : error,
        },
        'Failed to publish cast for proposal.',
      )
    }
  }
}
