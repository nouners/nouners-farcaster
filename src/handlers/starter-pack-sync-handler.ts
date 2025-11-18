import { getMe } from '@/services/warpcast/get-me'
import { getStarterPacks } from '@/services/warpcast/get-starter-packs'
import { updateStarterPack } from '@/services/warpcast/update-starter-pack'
import { logger } from '@/utilities/logger'
import { filter, first, pipe } from 'remeda'

/**
 * Keeps the curated starter pack in sync with the latest Farcaster voters
 * so discovery surfaces match current governance participants.
 * @param env - Worker bindings with KV access and Warpcast credentials.
 */
export async function starterPackSyncHandler(env: Env): Promise<void> {
  const farcasterVoters = await getFarcasterVoters(env)
  const { user } = await getMe(env)

  const firstStarterPack = await fetchFirstMatchingStarterPack(env, user.fid)

  if (!firstStarterPack) {
    logger.warn('No matching starter pack found')
    return
  }

  const { id, name, description, labels } = firstStarterPack

  const { success } = await updateStarterPack(
    env,
    id,
    name,
    description,
    [...farcasterVoters],
    labels,
  )

  if (success) {
    logger.info({ starterPackId: id }, 'Successfully updated starter pack')
  } else {
    logger.error({ starterPackId: id }, 'Failed to update starter pack')
  }
}

/**
 * Retrieves the list of Farcaster voters from the KV storage.
 * @param env - Environment configuration containing the KV namespace.
 * @returns A list of Farcaster voter IDs or an empty array if none are found.
 */
async function getFarcasterVoters(env: Env): Promise<number[]> {
  const { KV: kv } = env
  return (
    (await kv.get<number[] | null>('nouns-farcaster-voters', {
      type: 'json',
    })) ?? []
  )
}

/**
 * Fetches the first starter pack that matches the "Nouns-Radar" prefix.
 * @param env - Environment configuration.
 * @param fid - The Farcaster ID of the current user.
 * @returns The first matching starter pack or `null` if no match is found.
 */
async function fetchFirstMatchingStarterPack(env: Env, fid: number) {
  const { starterPacks } = await getStarterPacks(env, fid, 100)

  return pipe(
    starterPacks,
    filter((pack) => pack.id.startsWith('Nouns-Radar')),
    first(),
  )
}
