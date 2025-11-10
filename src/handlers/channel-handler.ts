import { getCastLikes } from '@/services/warpcast/get-cast-likes'
import { getFeedItems } from '@/services/warpcast/get-feed-items'
import { getMe } from '@/services/warpcast/get-me'
import { logger } from '@/utilities/logger'
import { chunk, map, pipe } from 'remeda'

interface ReactionBody {
  type: 'like' | 'recast'
  data: {
    hash: string
  }
}

/**
 * Fetches noun feed items from the specified environment until the maximum
 * number of items is reached or no more items are available.
 * @param env - The environment from which to fetch the feed items.
 * @returns A promise that resolves to an object containing the fetched items.
 */
async function getNounFeedItems(env: Env) {
  logger.info('Fetching noun feed items')
  const allItems: Awaited<ReturnType<typeof getFeedItems>>['items'] = []
  let fetchedItemsCount = 0
  const maxItems = 30

  let excludeItemIdPrefixes: string[] = []

  while (fetchedItemsCount < maxItems) {
    logger.info({ excludeItemIdPrefixes }, 'Fetching feed items with prefixes')
    const { items } = await getFeedItems(
      env,
      'nouns',
      'default',
      excludeItemIdPrefixes,
    )

    // Add the new items to the total collection.
    allItems.push(...items)
    fetchedItemsCount += items.length

    if (items.length === 0) {
      // No more items to fetch, exit the loop.
      logger.info('No more items to fetch')
      break
    }

    // Add new prefixes to `excludeItemIdPrefixes` without resetting it.
    const newPrefixes = pipe(
      items,
      map((item) => item.cast.hash.replace(/^0x/, '').slice(0, 8)),
    )
    excludeItemIdPrefixes = excludeItemIdPrefixes.concat(newPrefixes)
  }

  logger.info({ fetchedItemsCount }, 'Fetched total items')
  return { items: allItems }
}

/**
 * Reviews recent casts in the Nouns channel and enqueues like / recast
 * reactions whenever enough verified Nouners have engaged but the bot has
 * not yet done so, keeping the feed active without double-posting.
 * @param env - Worker bindings providing KV state, queue access, and tokens.
 * @returns Promise that resolves after qualifying casts are enqueued.
 */
export async function handleNounsChannel(env: Env) {
  logger.info('Handling Nouns channel')
  const { KV: kv, QUEUE: queue } = env

  // Fetch the current user
  logger.info('Fetching current user')
  const { user } = await getMe(env)
  const nounersLikeThreshold = 2

  // Fetch Farcaster user IDs from KV store
  logger.info('Fetching Farcaster user IDs from KV store')
  const farcasterUsers: number[] =
    (await kv.get('nouns-farcaster-users', { type: 'json' })) ?? []
  if (farcasterUsers.length === 0) {
    logger.info('No Farcaster users found')
    return // Exit if no Farcaster users found
  }

  // Fetch Farcaster feed items
  logger.info('Fetching Farcaster feed items')
  const { items } = await getNounFeedItems(env)

  const batch: MessageSendRequest<ReactionBody>[] = []

  // Process each cast item
  for (const item of items) {
    logger.info({ hash: item.cast.hash }, 'Processing cast item')
    let nounersLikeCount = 0

    // Skip if no likes on the item
    if (item.cast.reactions.count <= 0) {
      logger.info({ hash: item.cast.hash }, 'Skipping item with no likes')
      continue
    }

    // Fetch likes for the cast item
    logger.info({ hash: item.cast.hash }, 'Fetching likes for item')
    const { likes } = await getCastLikes(env, item.cast.hash)
    const likerIds = pipe(
      likes,
      map((like) => like.reactor.fid),
    )

    // Skip if the current user already liked the item
    if (likerIds.includes(user.fid)) {
      logger.info(
        { hash: item.cast.hash },
        'Current user already liked the item',
      )
      continue
    }

    // Count likes from Farcaster users
    for (const likerId of likerIds) {
      if (farcasterUsers.includes(likerId)) {
        nounersLikeCount += 1
      }
    }

    // Recast and like the item if threshold is met
    if (nounersLikeCount >= nounersLikeThreshold) {
      logger.info(
        { hash: item.cast.hash, nounersLikeCount },
        'Threshold met, preparing to like and recast item',
      )
      batch.push({ body: { type: 'like', data: { hash: item.cast.hash } } })
      batch.push({ body: { type: 'recast', data: { hash: item.cast.hash } } })
    }
  }

  if (batch.length > 0) {
    try {
      const batchSizeLimit = 100

      const chunkedBatches = pipe(batch, chunk(batchSizeLimit))

      for (const chunk of chunkedBatches) {
        await queue.sendBatch(chunk)
        logger.info({ chunk }, 'Chunk enqueued successfully')
      }
    } catch (error) {
      logger.error({ error }, 'Error enqueuing batch')
    }
  }
}

/**
 * Entry point for channel workflows so additional strategies can be added
 * without touching the scheduler wiring.
 * @param env - Worker bindings consumed by the individual channel handlers.
 * @returns Promise resolved after all configured channel workflows finish.
 */
export async function channelHandler(env: Env) {
  logger.info('Channel handler started')
  await handleNounsChannel(env)
  logger.info('Channel handler completed')
}
