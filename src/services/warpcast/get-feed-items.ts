import { fetchRequest, HttpRequestMethod } from '@/services/warpcast/index'
import { Item } from './types'

interface Result {
  items: Item[]
  latestMainCastTimestamp: number
  feedTopSeenAtTimestamp: number
  replaceFeed: boolean
}

interface Response {
  result: Result
}

/**
 * Requests feed items for a Warpcast channel without mutating the feed
 * cursor so callers can decide how aggressively they want to page and
 * which hashes to filter out.
 * @param env - Worker bindings with Warpcast base URL and access token.
 * @param feedKey - Logical key of the channel feed to pull.
 * @param feedType - Feed presentation style such as 'default'.
 * @param excludeItemIdPrefixes - Hash prefixes to omit to avoid repeats.
 * @returns API response payload with feed items and timing metadata.
 */
export const getFeedItems = async (
  env: Env,
  feedKey: string,
  feedType: string,
  excludeItemIdPrefixes?: string[],
): Promise<Result> => {
  const { WARPCAST_ACCESS_TOKEN: accessToken, WARPCAST_BASE_URL: baseUrl } = env

  const body = { feedKey, feedType, excludeItemIdPrefixes }

  const { result } = await fetchRequest<Response>(
    baseUrl,
    accessToken,
    HttpRequestMethod.POST,
    '/v2/feed-items',
    {
      json: { ...body },
    },
  )

  return result
}
