import { fetchRequest, HttpRequestMethod } from '@/services/warpcast/index'

interface Embed {
  url: string
}

interface PublishCastRequest {
  text: string
  embeds?: Embed[]
  channelKey?: string
  parent?: {
    hash?: string
    url?: string
  }
  [key: string]: unknown
}

interface Result {
  cast: {
    hash: string
    threadHash: string
    text: string
    author: {
      fid: number
      username: string
    }
  }
}

interface Response {
  result: Result
}

/**
 * Publishes a cast to Warpcast.
 * @param env - The environment configuration.
 * @param text - The text content of the cast (max 320 characters).
 * @param channelKey - Optional channel to post the cast to.
 * @param embeds - Optional array of embeds (URLs, images, etc.).
 * @param parent - Optional parent cast hash or URL for replies.
 * @param parent.hash - Parent cast hash when replying to a thread.
 * @param parent.url - Fallback URL to the parent cast when hash is unavailable.
 * @returns - A promise that resolves to a Result object from the server.
 */
export const publishCast = async (
  env: Env,
  text: string,
  channelKey?: string,
  embeds?: Embed[],
  parent?: { hash?: string; url?: string },
): Promise<Result> => {
  const { WARPCAST_ACCESS_TOKEN: accessToken, WARPCAST_BASE_URL: baseUrl } = env

  const body: PublishCastRequest = {
    text,
  }

  if (embeds && embeds.length > 0) {
    body.embeds = embeds
  }

  if (channelKey) {
    body.channelKey = channelKey
  }

  if (parent) {
    body.parent = parent
  }

  const { result } = await fetchRequest<Response>(
    baseUrl,
    accessToken,
    HttpRequestMethod.POST,
    '/v2/casts',
    { json: body },
  )

  return result
}
