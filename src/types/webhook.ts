import { z } from 'zod'

const webhookBlockSchema = z.object({
  logs: z.array(z.unknown()),
  hash: z.string(),
  number: z.number(),
  timestamp: z.number(),
})

const webhookEventDataSchema = z.object({
  block: webhookBlockSchema,
})

const webhookEventSchema = z.object({
  data: webhookEventDataSchema,
  sequenceNumber: z.string(),
  network: z.string(),
})

export const webhookPayloadSchema = z.object({
  event: webhookEventSchema,
  webhookId: z.string(),
  id: z.string(),
  createdAt: z.string(),
  type: z.string(),
})

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>
