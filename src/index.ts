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
   * @param request
   * @param env
   * @param ctx
   */
  fetch: async (request, env, ctx) => {
    return fetchHandler(request, env, ctx)
  },
  /**
   * Passes queue batches to the queue handler so retries and acks remain
   * centralized in one module.
   * @param batch
   * @param env
   * @param ctx
   */
  queue: async (batch, env, ctx) => {
    await queueHandler(batch, env, ctx)
  },
  /**
   * Maps scheduled cron triggers to the scheduler handler, which inspects
   * the cron string and executes the appropriate job.
   * @param controller
   * @param env
   */
  scheduled: async (controller, env) => {
    await scheduledHandler(controller, env)
  },
} satisfies ExportedHandler<Env>
