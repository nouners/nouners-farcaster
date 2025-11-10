import { fetchRequest, HttpRequestMethod } from '@/services/warpcast/index'
import { User } from '@/services/warpcast/types'

interface Result {
  user: User
}

interface Response {
  result: Result
}

/**
 * Fetches the Warpcast profile associated with the configured access token
 * so jobs know which user is performing automated actions.
 * @param env - Worker bindings containing Warpcast URL and token.
 * @returns Authenticated user metadata returned by Warpcast.
 * @throws {Error} Propagates failures from the `fetchRequest` helper.
 */
export const getMe = async (env: Env): Promise<Result> => {
  const { WARPCAST_ACCESS_TOKEN: accessToken, WARPCAST_BASE_URL: baseUrl } = env

  const { result } = await fetchRequest<Response>(
    baseUrl,
    accessToken,
    HttpRequestMethod.GET,
    '/v2/me',
    {},
  )

  return result
}
