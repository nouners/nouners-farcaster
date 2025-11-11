import { getBlockNumber } from '@/services/ethereum/get-block-number'
import { getBlockTimestamp } from '@/services/ethereum/get-block-timestamp'
import { getProposals } from '@/services/nouns/get-proposals'
import { getFollowers } from '@/services/warpcast/get-followers'
import { getMe } from '@/services/warpcast/get-me'
import { getUserByVerification } from '@/services/warpcast/get-user-by-verification'
import {
  formatProposalLink,
  resolveProposalBaseUrl,
} from '@/utilities/formatters/proposal-link'
import { buildProposalReminderMessage } from '@/utilities/messages/proposal-reminder'
import { logger } from '@/utilities/logger'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'
import { filter, isTruthy, map, pipe } from 'remeda'
import { ProposalStatus } from '@nekofar/nouns/subgraphs'

interface DirectCastBody {
  type: 'direct-cast'
  data: {
    recipientFid: number
    message: string
    idempotencyKey: string
  }
}

/**
 * Converts a given timestamp to a relative time string.
 * @param timestamp - The timestamp to be converted.
 * @returns A relative time string.
 */
function toRelativeTime(timestamp: number): string {
  return DateTime.fromSeconds(timestamp).toRelative({
    style: 'long',
    unit: ['hours', 'minutes'],
  })
}

/**
 * Queues direct-cast reminders for every active proposal by intersecting
 * cached Farcaster voters with the bot's followers and skipping anyone who
 * has already voted or cannot receive messages.
 *
 * Workflow:
 * - Loads cached Farcaster voters/users plus the bot's follower list.
 * - Fetches active proposals whose voting windows are still open.
 * - Resolves on-chain voters to Farcaster fids to avoid duplicate nudges.
 * - Enqueues `direct-cast` tasks with deterministic idempotency keys.
 *
 * @param env - Worker bindings providing KV storage, Warpcast access, and the
 *   queue used to fan out reminder casts.
 * @returns Promise that resolves once all eligible reminders are enqueued.
 */
export async function proposalHandler(env: Env) {
  const { KV: kv, QUEUE: queue } = env

  logger.info('Fetching current user data...')
  const { user } = await getMe(env)

  logger.info('Fetching Farcaster users and voters from KV...')
  const farcasterUsers =
    (await kv.get<number[] | null>('nouns-farcaster-users', {
      type: 'json',
    })) ?? []
  const farcasterVoters =
    (await kv.get<number[] | null>('nouns-farcaster-voters', {
      type: 'json',
    })) ?? []

  logger.info(
    {
      farcasterUsersCount: farcasterUsers.length,
      farcasterVotersCount: farcasterVoters.length,
    },
    'Fetched Farcaster users and voters.',
  )

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

  const batch: MessageSendRequest<DirectCastBody>[] = []

  // Fetch the follower list; pagination inside the service enforces the requested size.
  const { users: followers } = await getFollowers(env, user.fid)
  const followersFids = pipe(
    followers,
    map((user) => user.fid),
  )
  logger.info(
    {
      followersFidsCount: followersFids.length,
      followersFids,
    },
    'Fetched followers FIDs.',
  )

  const proposalBaseUrl = resolveProposalBaseUrl(env)

  for (const proposal of proposals) {
    const { votes, endBlock, startBlock, id } = proposal

    logger.debug({ proposalId: id }, 'Fetching timestamps for proposal blocks.')
    const [startBlockTimestamp, endBlockTimestamp] = await Promise.all([
      getBlockTimestamp(env, Number(startBlock)),
      getBlockTimestamp(env, Number(endBlock)),
    ])

    const proposalStart = toRelativeTime(startBlockTimestamp)
    const proposalEnd = toRelativeTime(endBlockTimestamp)

    logger.debug(
      { proposalId: id, start: proposalStart, end: proposalEnd },
      'Processed proposal timeframes.',
    )

    // Resolve on-chain voters to Farcaster fids so we skip people who already
    // participated.
    const voters = await Promise.all(
      votes.map(async (vote) => {
        try {
          const { user } = await getUserByVerification(
            env,
            vote.voter.id.toLowerCase(),
          )
          return user.fid
        } catch (error) {
          if (
            error instanceof Error &&
            !error.message.startsWith('No FID has connected')
          ) {
            logger.error(
              { error, voterId: vote.voter.id },
              'Error fetching Farcaster user for voter.',
            )
          }
          return null
        }
      }),
    ).then((results) => filter(results, isTruthy))

    logger.info(
      { votersCount: voters.length, proposalId: id },
      'Fetched and filtered voters for the proposal.',
    )

    const message = buildProposalReminderMessage({
      proposalId: id,
      startRelative: proposalStart,
      endRelative: proposalEnd,
      link: formatProposalLink(id, proposalBaseUrl),
    })
    // Hash the message body so retries cannot enqueue duplicate tasks.
    const idempotencyKey = createHash('sha256').update(message).digest('hex')

    for (const recipientFid of farcasterVoters) {
      if (recipientFid === user.fid) {
        logger.debug(
          { fid: recipientFid },
          'Skipping user: recipient is the current user.',
        )
        continue
      }

      if (!followersFids.includes(recipientFid)) {
        logger.debug(
          { fid: recipientFid },
          'Skipping user: recipient is not a follower.',
        )
        continue
      }

      if (voters.includes(recipientFid)) {
        logger.debug(
          { fid: recipientFid },
          'Skipping user: recipient has already voted.',
        )
        continue
      }

      if (!farcasterUsers.includes(recipientFid)) {
        logger.debug(
          { fid: recipientFid },
          'Skipping user: recipient is not a Farcaster user.',
        )
        continue
      }

      const task: MessageSendRequest<DirectCastBody> = {
        body: {
          type: 'direct-cast',
          data: {
            recipientFid,
            message,
            idempotencyKey,
          },
        },
      }

      batch.push(task)
    }
  }

  if (batch.length > 0) {
    logger.info(
      { batchSize: batch.length },
      'Sending message batch to the queue...',
    )
    try {
      await queue.sendBatch(batch)
      logger.info({ batchSize: batch.length }, 'Batch enqueued successfully.')
    } catch (error) {
      logger.error({ error, batch }, 'Error enqueuing message batch.')
    }
  } else {
    logger.debug('No messages to send at this time.')
  }
}
