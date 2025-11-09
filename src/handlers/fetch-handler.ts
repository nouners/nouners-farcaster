import { webhookHandler } from '@/handlers/webhook-handler'
import { logger } from '@/utilities/logger'
import { jsonResponse } from '@/utilities/responses/json-response'

/**
 * Handles incoming fetch requests for the Worker.
 * Supports health checks and webhook ingestion with signature validation so that
 * upstream services receive structured responses.
 * @param request - The inbound Request object.
 * @param env - Worker bindings and variables.
 * @param _ctx - Execution context, reserved for future async work.
 * @returns A Response describing the Worker state.
 */
export async function fetchHandler(
  request: Request,
  env: Env,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx: ExecutionContext,
): Promise<Response> {
  const { method } = request
  const { pathname } = new URL(request.url)

  logger.debug({ method, pathname }, 'Received fetch request.')

  if (pathname === '/' || pathname === '/health' || pathname === '/healthz') {
    if (method !== 'GET') {
      return jsonResponse(
        { error: 'Method Not Allowed', method },
        {
          status: 405,
          headers: {
            Allow: 'GET',
          },
        },
      )
    }

    return jsonResponse({
      status: 'ok',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    })
  }

  if (pathname === '/webhook') {
    return webhookHandler(request, env)
  }

  return jsonResponse(
    { error: 'Not Found', path: pathname },
    {
      status: 404,
    },
  )
}
