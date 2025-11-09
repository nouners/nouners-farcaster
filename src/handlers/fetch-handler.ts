import { logger } from '@/utilities/logger'

/**
 * Builds a JSON response with standardized headers.
 * @param body - The JSON-serializable payload.
 * @param init - Optional response init overrides.
 * @returns A Cloudflare Worker Response instance.
 */
function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'no-store')

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
}

/**
 * Handles incoming fetch requests for the Worker.
 * Supports a simple health-check endpoint and returns structured errors for
 * unsupported paths or methods so that upstream monitors behave predictably.
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

  if (pathname === '/' || pathname === '/health' || pathname === '/healthz') {
    return jsonResponse({
      status: 'ok',
      environment: env.NODE_ENV ?? 'production',
      timestamp: new Date().toISOString(),
    })
  }

  return jsonResponse(
    { error: 'Not Found', path: pathname },
    {
      status: 404,
    },
  )
}
