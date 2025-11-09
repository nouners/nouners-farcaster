import {
  createExecutionContext,
  createScheduledController,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test'
import { expect, it } from 'vitest'
import { createHmac } from 'node:crypto'
// Could import any other source file/function here
import worker from '../src'

const sampleWebhookPayload = {
  event: {
    data: {
      block: {
        logs: [],
        hash: '0xdeadbeefcafebabefeedface1234567890abcdef1234567890abcdef12345678',
        number: 12345678,
        timestamp: 1700000000,
      },
    },
    sequenceNumber: '99999999999999999999',
    network: 'ETH_TESTNET',
  },
  webhookId: 'wh_example_obfuscated',
  id: 'whevt_example_obfuscated',
  createdAt: '2025-01-01T00:00:00.000000000Z',
  type: 'GRAPHQL',
} as const

// eslint-disable-next-line vitest/expect-expect
it('calls scheduled handler', async () => {
  const ctrl = createScheduledController({
    scheduledTime: new Date(1000),
    cron: '* * * * *',
  })
  const ctx = createExecutionContext()
  // @ts-expect-error: TypeScript error ignored for testing purposes
  await worker.scheduled(ctrl, env, ctx)
  await waitOnExecutionContext(ctx)
})

it('responds via fetch handler', async () => {
  const ctx = createExecutionContext()
  const response = await worker.fetch(
    new Request('https://example.com/health'),
    env,
    ctx,
  )

  await waitOnExecutionContext(ctx)

  expect(response.status).toBe(200)
  const payload = await response.json()
  expect(payload).toMatchObject({ status: 'ok' })
})

it('accepts webhook payloads', async () => {
  env.ALCHEMY_SIGNING_KEY = 'test-signing-key'
  const body = JSON.stringify(sampleWebhookPayload)
  const signature = createHmac('sha256', env.ALCHEMY_SIGNING_KEY)
    .update(body, 'utf8')
    .digest('hex')

  const ctx = createExecutionContext()
  const response = await worker.fetch(
    new Request('https://example.com/webhook', {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/json',
        'x-alchemy-signature': signature,
      },
    }),
    env,
    ctx,
  )

  await waitOnExecutionContext(ctx)

  expect(response.status).toBe(202)
  const payload = await response.json()
  expect(payload).toMatchObject({ status: 'accepted' })
})

it('rejects webhook payloads with invalid signature', async () => {
  env.ALCHEMY_SIGNING_KEY = 'test-signing-key'
  const body = JSON.stringify(sampleWebhookPayload)
  const ctx = createExecutionContext()
  const response = await worker.fetch(
    new Request('https://example.com/webhook', {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/json',
        'x-alchemy-signature': 'invalid-signature',
      },
    }),
    env,
    ctx,
  )

  await waitOnExecutionContext(ctx)

  expect(response.status).toBe(401)
  const payload = await response.json()
  expect(payload).toMatchObject({ error: 'Invalid signature' })
})

it('rejects webhook payloads with invalid structure', async () => {
  env.ALCHEMY_SIGNING_KEY = 'test-signing-key'
  const body = JSON.stringify({})
  const signature = createHmac('sha256', env.ALCHEMY_SIGNING_KEY)
    .update(body, 'utf8')
    .digest('hex')

  const ctx = createExecutionContext()
  const response = await worker.fetch(
    new Request('https://example.com/webhook', {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/json',
        'x-alchemy-signature': signature,
      },
    }),
    env,
    ctx,
  )

  await waitOnExecutionContext(ctx)

  expect(response.status).toBe(400)
  const payload = await response.json()
  expect(payload).toMatchObject({ error: 'Invalid payload' })
})
