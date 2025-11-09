import { logger } from '@/utilities/logger'
import { createHmac } from 'node:crypto'

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
 * Validates the webhook signature using an HMAC SHA256 digest.
 * @param body - Raw request body as received (must not be parsed first).
 * @param signature - The signature value from the `x-alchemy-signature` header.
 * @param signingKey - Shared secret configured in the environment.
 * @returns True when the signature matches, false otherwise.
 */
function isValidSignature(
  body: string,
  signature: string | null,
  signingKey?: string,
): boolean {
  if (!signature || !signingKey) {
    return false
  }

  const digest = createHmac('sha256', signingKey).update(body, 'utf8').digest('hex')
  return signature === digest
}

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
    if (method !== 'POST') {
      return jsonResponse(
        { error: 'Method Not Allowed', method },
        {
          status: 405,
          headers: {
            Allow: 'POST',
          },
        },
      )
    }

    const rawBody = await request.text()
    const signature = request.headers.get('x-alchemy-signature')

    if (!env.ALCHEMY_SIGNING_KEY) {
      logger.error('Missing Alchemy signing key.')
      return jsonResponse(
        { error: 'Server misconfigured' },
        { status: 500 },
      )
    }

    if (!isValidSignature(rawBody, signature, env.ALCHEMY_SIGNING_KEY)) {
      logger.warn('Invalid webhook signature received.')
      return jsonResponse(
        { error: 'Invalid signature' },
        { status: 401 },
      )
    }

    let payload: unknown = null
    try {
      payload = JSON.parse(rawBody)
    } catch (error) {
      logger.warn({ error }, 'Webhook payload could not be parsed.')
    }

    logger.info({ payload }, 'Webhook payload received.')

    return jsonResponse(
      {
        status: 'accepted',
        receivedAt: new Date().toISOString(),
      },
      { status: 202 },
    )
  }

  return jsonResponse(
    { error: 'Not Found', path: pathname },
    {
      status: 404,
    },
  )
}
