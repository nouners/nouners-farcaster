import { getDirectCastConversations } from '@/services/warpcast/get-direct-cast-conversations'
import { getMe } from '@/services/warpcast/get-me'
import { logger } from '@/utilities/logger'
import { createHash } from 'node:crypto'
import { flat, pipe, sort, unique } from 'remeda'

interface DirectCastBody {
  type: 'direct-cast'
  data: {
    recipientFid: number
    message: string
    idempotencyKey: string
  }
}

/**
 * Handles the subscribers by retrieving conversations and participants,
 * filtering out duplicates, and storing the subscribers in KV.
 * @param env - The environment object containing required dependencies.
 * @returns - A Promise that resolves once the subscribers are handled.
 */
async function handleSubscribers(env: Env) {
  const { KV: kv } = env
  const cacheKey = 'nouns-farcaster-subscribers'
  const categories = ['default', 'request']

  logger.info('Fetching current subscribers from KV...')
  const subscribers: number[] =
    (await kv.get<number[] | null>(cacheKey, { type: 'json' })) ?? []

  logger.info(
    { subscribersCount: subscribers.length },
    'Fetched current subscribers.',
  )

  const newSubscribers = await Promise.all(
    categories.map(async (category) => {
      logger.info({ category }, 'Fetching conversations for category.')
      // Let the service page through conversations until the category limit is satisfied.
      const { conversations } = await getDirectCastConversations(
        env,
        100,
        category as 'default' | 'request',
      )
      logger.info(
        { category, conversationsCount: conversations.length },
        'Fetched conversations.',
      )
      return conversations.flatMap(({ participants }) =>
        participants.map(({ fid }) => fid),
      )
    }),
  )

  const updatedSubscribers = pipe(
    [...subscribers, ...flat(newSubscribers)],
    unique(),
    sort((a, b) => a - b),
  )

  logger.info(
    { updatedSubscribersCount: updatedSubscribers.length },
    'Updated subscribers list.',
  )

  await kv.put(cacheKey, JSON.stringify(updatedSubscribers))
  logger.info('Subscribers list saved to KV.')
}

/**
 * Handles unread messages by sending an automated response to the participants
 * in the unread direct cast conversations.
 * @param env - The environment object containing configuration and services.
 * @returns A promise that resolves when the messages have been handled.
 */
async function handleMessages(env: Env) {
  const { KV: kv, QUEUE: queue } = env
  const cacheKey = 'nouns-farcaster-responders'

  logger.info('Fetching current responders from KV...')
  const respondedFids: number[] =
    (await kv.get<number[] | null>(cacheKey, { type: 'json' })) ?? []

  logger.info(
    { respondedFidsCount: respondedFids.length },
    'Fetched FIDs who have already responded.',
  )

  logger.info('Fetching current user data...')
  const { user } = await getMe(env)

  logger.info('Fetching unread conversations...')
  // Pull unread conversations; the service paginates to cap the request at the given limit.
  const { conversations } = await getDirectCastConversations(
    env,
    100,
    'default',
    'unread',
  )

  logger.info(
    { conversationsCount: conversations.length },
    'Fetched unread conversations.',
  )

  const participants = conversations.flatMap(({ participants }) =>
    participants.map(({ fid }) => fid),
  )

  const batch: MessageSendRequest<DirectCastBody>[] = []

  for (const recipientFid of participants) {
    if (recipientFid === user.fid) {
      logger.debug({ recipientFid }, 'Skipping message for current user.')
      continue
    }

    if (respondedFids.includes(recipientFid)) {
      logger.debug({ recipientFid }, 'Skipping already responded user.')
      continue
    }

    const message =
      'This account runs on autopilot, so please don’t send messages directly here. ' +
      'If you have any issues or questions, just reach out to @nekofar! 😊'
    const idempotencyKey = createHash('sha256').update(message).digest('hex')

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
    respondedFids.push(recipientFid)
  }

  if (batch.length > 0) {
    logger.info(
      { batchSize: batch.length },
      'Sending message batch to the queue...',
    )
    try {
      await queue.sendBatch(batch)
      logger.info({ batchSize: batch.length }, 'Batch enqueued successfully.')

      // Update the KV store with the new list of responded users
      await kv.put(cacheKey, JSON.stringify(respondedFids))
      logger.info('Updated responders list saved to KV.')
    } catch (error) {
      logger.error({ error, batch }, 'Error enqueuing message batch.')
    }
  } else {
    logger.debug('No messages to send at this time.')
  }
}

/**
 * Updates the subscriber list by adding any new participants from direct cast conversations.
 * @param env - The environment object containing the KV store.
 * @returns - A promise that resolves after the update is completed.
 */
export async function directCastsHandler(env: Env) {
  logger.info('Starting direct cast handler process...')
  await handleMessages(env)
  await handleSubscribers(env)
  logger.info('Direct cast handler process completed.')
}
