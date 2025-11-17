import { cacheHandler } from '@/handlers/cache-handler'
import { channelHandler } from '@/handlers/channel-handler'
import { directCastsHandler } from '@/handlers/direct-casts-handler'
import { proposalHandler } from '@/handlers/proposal-handler'
import { starterPackHandler } from '@/handlers/starter-pack-handler'
import { logger } from '@/utilities/logger'
import { CronTime } from 'cron-time-generator'

/**
 * Handles scheduled events based on the provided cron schedule.
 * @param controller - The controller containing the cron schedule information.
 * @param env - The environment object that contains configuration and state.
 * @returns A promise that resolves when the handler is done executing.
 */
export async function scheduledHandler(
  controller: ScheduledController,
  env: Env,
) {
  switch (controller.cron) {
    case CronTime.everyHour():
      // Refresh cached holders/voters data sets that power other jobs.
      await cacheHandler(env)
      // Auto-like and recast qualifying posts in the Nouns channel.
      await channelHandler(env)
      // Sync the curated starter pack with the latest Farcaster voters.
      await starterPackHandler(env)
      break
    case CronTime.every(12).hours():
      // Auto-respond to DMs and refresh the subscriber cache.
      await directCastsHandler(env)
      break
    case CronTime.everyDayAt(14, 0):
      // Queue proposal reminder direct casts for eligible voters.
      await proposalHandler(env)
      break
    default:
      logger.info({ cron: controller.cron }, 'No handler for the cron schedule')
  }
}
