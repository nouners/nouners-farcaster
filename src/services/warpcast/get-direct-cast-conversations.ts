import { fetchRequest, HttpRequestMethod } from '@/services/warpcast/index'
import { Conversation } from '@/services/warpcast/types'
import { IntRange } from 'type-fest'

interface Result {
  conversations: Conversation[]
  cursor?: string
}

interface Response {
  result: {
    conversations: Conversation[]
  }
  next?: {
    cursor: string
  }
}

/**
 * Retrieves direct cast conversations from the server.
 * @async
 * @param env - The environment variables.
 * @param [limit] - The maximum number of conversations to retrieve.
 * @param [category] - The category of conversations to retrieve.
 * @param [filter] - The filter to apply to conversations.
 * @param [cursor] - The cursor for pagination.
 * @returns - A promise that resolves to the retrieved conversations and cursor.
 */
export const getDirectCastConversations = async (
  env: Env,
  limit: IntRange<1, 101> = 15,
  category: 'default' | 'request' = 'default',
  filter?: 'unread' | 'group',
  cursor?: string,
): Promise<Result> => {
  const { WARPCAST_ACCESS_TOKEN: accessToken, WARPCAST_BASE_URL: baseUrl } = env
  let newCursor = cursor ?? ''
  let conversations: Conversation[] = []
  let response: Response

  do {
    // Request the next page of conversations using the current cursor.
    const params = {
      cursor: newCursor,
      limit: String(limit),
      category,
      ...(filter && { filter }),
    }
    response = await fetchRequest<Response>(
      baseUrl,
      accessToken,
      HttpRequestMethod.GET,
      '/v2/direct-cast-conversation-list',
      {
        params,
      },
    )
    // Accumulate conversations so we can stop once the desired limit is met.
    conversations = [...conversations, ...response.result.conversations]
    newCursor = response.next ? response.next.cursor : ''
  } while (response.next && conversations.length < limit)

  return { conversations: conversations.slice(0, limit), cursor: newCursor }
}
