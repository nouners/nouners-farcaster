import { fetchHandler } from '@/handlers/fetch-handler'
import { queueHandler } from '@/handlers/queue-handler'
import { scheduledHandler } from '@/handlers/scheduled-handler'

/**
 * Cloudflare Worker entry points that delegate runtime events to the
 * dedicated handlers so HTTP, queue, and scheduler logic stay isolated.
 */
export default {
  /**
   * Forwards every HTTP request to the fetch handler, which can use the
   * execution context to schedule follow-up work before returning.
   * @param request - Incoming HTTP request to handle.
   * @param env - Worker bindings for configuration and services.
   * @param ctx - Execution context used for background work.
   * @returns Response produced by the fetch handler.
   */
  fetch: async (request, env, ctx) => {
    return fetchHandler(request, env, ctx)
  },
  /**
   * Passes queue batches to the queue handler so retries and acks remain
   * centralized in one module.
   * @param batch - Queue batch delivered by Cloudflare.
   * @param env - Worker bindings for configuration and services.
   * @param ctx - Execution context used for background work.
   * @returns A promise that resolves when queue handling finishes.
   */
  queue: async (batch, env, ctx) => {
    await queueHandler(batch, env, ctx)
  },
  /**
   * Maps scheduled cron triggers to the scheduler handler, which inspects
   * the cron string and executes the appropriate job.
   * @param controller - Scheduler controller describing the cron trigger.
   * @param env - Worker bindings for configuration and services.
   * @returns A promise that resolves when the scheduled task completes.
   */
  scheduled: async (controller, env) => {
    await scheduledHandler(controller, env)
  },
} satisfies ExportedHandler<Env>
