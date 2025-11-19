import { logger } from '@/utilities/logger'
import { getBlockNumber } from '@/services/ethereum/get-block-number'
import { getProposals } from '@/services/nouns/get-proposals'
import { filter } from 'remeda'
import { ProposalStatus } from '@nekofar/nouns/subgraphs'
import { resolveProposalBaseUrl } from '@/utilities/formatters/proposal-link'
import { publishCast } from '@/services/warpcast'

/**
 * Announces active proposals on Warpcast so nouners can vote before they close.
 * @param env - Cloudflare worker bindings including KV and API tokens.
 */
export async function proposalAnnouncementHandler(env: Env) {
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

  const proposalBaseUrl = resolveProposalBaseUrl(env)

  for (const proposal of proposals) {
    const proposalId = proposal.id
    const kvKey = `announced:proposal:${proposalId}`

    // Check if we've already announced this proposal
    const storedCastHash = await env.KV.get(kvKey)

    if (storedCastHash) {
      logger.info(
        { proposalId, castHash: storedCastHash },
        'Proposal already announced, skipping.',
      )
      continue
    }

    // Format the cast message
    const proposalUrl = `${proposalBaseUrl}/${proposalId}`
    const castText = `🗳️ New Nouns proposal is now active!\n\nProposal ${proposalId}: ${proposal.title}\n\nVote now: ${proposalUrl}`

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
      await env.KV.put(kvKey, result.cast.hash, {
        expirationTtl: 60 * 60 * 24 * 30, // 30 days
      })
    } catch (error) {
      logger.error(
        { proposalId, error },
        'Failed to publish cast for proposal.',
      )
    }
  }
}
