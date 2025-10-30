import { getBlockNumber } from '@/services/ethereum/get-block-number'
import { getBlockTimestamp } from '@/services/ethereum/get-block-timestamp'
import { getProposals } from '@/services/nouns/get-proposals'
import { getFollowers } from '@/services/warpcast/get-followers'
import { getMe } from '@/services/warpcast/get-me'
import { getUserByVerification } from '@/services/warpcast/get-user-by-verification'
import { buildProposalReminderMessage } from '@/utilities/messages/proposal-reminder'
import { logger } from '@/utilities/logger'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'
import { filter, isTruthy, map, pipe } from 'remeda'

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
 * Handles the proposal by retrieving or fetching voters from KV store and logging them.
 * @param env - The environment object.
 * @returns - A promise that resolves once the proposal is handled.
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
      proposal.status === 'ACTIVE' && Number(proposal.endBlock) > blockNumber,
  )

  logger.info(
    { activeProposalsCount: proposals.length },
    'Filtered active proposals.',
  )

  const batch: MessageSendRequest<DirectCastBody>[] = []

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
    })
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
