import { fetchRequest, HttpRequestMethod } from '@/services/warpcast/index'

interface Result {
  success: boolean
}

interface Response {
  result: Result
}

/**
 * Updates a starter pack on the Warpcast platform.
 * @param env - The environment variables required for the API request, including access tokens and base URLs.
 * @param id - The unique identifier of the starter pack to update.
 * @param name - The new name of the starter pack.
 * @param description - A detailed description of the starter pack.
 * @param fids - An array of numeric identifiers representing FIDs associated with the starter pack.
 * @param labels - An array of labels categorizing the starter pack.
 * @returns A promise that resolves with the updated starter pack details (`Result`).
 * @throws {Error} Will throw an error if the API request fails or if there are errors in the response payload.
 */
export const updateStarterPack = async (
  env: Env,
  id: string,
  name: string,
  description: string,
  fids: number[],
  labels: string[],
): Promise<Result> => {
  const { WARPCAST_ACCESS_TOKEN: accessToken, WARPCAST_BASE_URL: baseUrl } = env
  const body = { id, name, description, fids, labels }

  const { result } = await fetchRequest<Response>(
    baseUrl,
    accessToken,
    HttpRequestMethod.PATCH,
    '/v2/starter-pack',
    {
      json: body,
    },
  )

  return result
}
