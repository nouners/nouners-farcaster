import { fetchRequest, HttpRequestMethod } from '@/services/warpcast/index'
import { User } from '@/services/warpcast/types'

interface Result {
  user: User
}

interface Response {
  result: Result
}

/**
 * Looks up a Warpcast user via a verified wallet address, allowing us to
 * bridge on-chain voter data with Farcaster identities.
 * @param env - Worker bindings containing Warpcast credentials.
 * @param address - Wallet address to resolve.
 * @returns The Warpcast user tied to the supplied verification.
 * @throws {Error} When Warpcast returns an error or the request fails.
 */
export const getUserByVerification = async (
  env: Env,
  address: string,
): Promise<Result> => {
  const { WARPCAST_ACCESS_TOKEN: accessToken, WARPCAST_BASE_URL: baseUrl } = env

  const { result } = await fetchRequest<Response>(
    baseUrl,
    accessToken,
    HttpRequestMethod.GET,
    '/v2/user-by-verification',
    {
      params: { address },
    },
  )

  return result
}
