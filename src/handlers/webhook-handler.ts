import { jsonResponse } from '@/utilities/responses/json-response'
import { logger } from '@/utilities/logger'
import { createHmac } from 'node:crypto'
import { webhookPayloadSchema } from '@/types/webhook'
import type { WebhookPayload } from '@/types/webhook'

/**
 * Validates the webhook signature using the configured signing key.
 * @param body - Raw request body as a string.
 * @param signature - Signature from the `x-alchemy-signature` header.
 * @param signingKey - Shared secret stored in the environment.
 * @returns True when the digest matches, false otherwise.
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
 * Parses and validates a webhook payload string.
 * @param rawBody - The raw body string from the request.
 * @returns A valid payload when parsing succeeds, otherwise null.
 */
function parseWebhookPayload(rawBody: string): WebhookPayload | null {
  try {
    const parsed: unknown = JSON.parse(rawBody)
    const result = webhookPayloadSchema.safeParse(parsed)
    if (result.success) {
      return result.data
    }

    logger.warn(
      { issues: result.error.issues },
      'Webhook payload failed schema validation.',
    )
    return null
  } catch (error) {
    logger.warn({ error }, 'Webhook payload could not be parsed to JSON.')
    return null
  }
}

/**
 * Handles webhook requests by validating signatures and enqueuing follow-up work.
 * @param request - Incoming request object with headers/body to validate.
 * @param env - Environment bindings needed for validation and logging.
 * @returns A JSON response describing the result.
 */
export async function webhookHandler(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(
      { error: 'Method Not Allowed', method: request.method },
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
    return jsonResponse({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!isValidSignature(rawBody, signature, env.ALCHEMY_SIGNING_KEY)) {
    logger.warn('Invalid webhook signature received.')
    return jsonResponse({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = parseWebhookPayload(rawBody)
  if (!payload) {
    logger.warn({ rawBody }, 'Webhook payload failed validation.')
    return jsonResponse({ error: 'Invalid payload' }, { status: 400 })
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
