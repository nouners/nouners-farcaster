import { fetchRequest, HttpRequestMethod } from '@/services/warpcast/index'
import { StarterPack } from '@/services/warpcast/types'
import type { IntRange } from 'type-fest'

interface Result {
  starterPacks: StarterPack[]
  cursor?: string
}

interface Response {
  result: Result
}

/**
 * Retrieves starter packs owned or curated by the user associated with the
 * provided fid so automations can locate the correct pack before updating it.
 * @param env - Worker bindings containing Warpcast credentials.
 * @param fid - Farcaster ID whose starter packs should be fetched.
 * @param [limit] - Maximum packs to return (default 15, capped by API).
 * @returns Starter packs list plus the cursor supplied by Warpcast.
 */
export const getStarterPacks = async (
  env: Env,
  fid: number,
  limit: IntRange<0, 101> = 15,
): Promise<Result> => {
  const { WARPCAST_ACCESS_TOKEN: accessToken, WARPCAST_BASE_URL: baseUrl } = env

  const params = { fid: fid.toString(), limit: limit.toString() }

  const { result } = await fetchRequest<Response>(
    baseUrl,
    accessToken,
    HttpRequestMethod.GET,
    '/v2/starter-packs',
    {
      params,
    },
  )

  return result
}
