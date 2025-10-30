import { likeCast } from '@/services/warpcast'
import { recast } from '@/services/warpcast/recast'
import { sendDirectCast } from '@/services/warpcast/send-direct-cast'
import { logger } from '@/utilities/logger'

interface ReactionBody {
  type: 'like' | 'recast'
  data: {
    hash: string
  }
}

interface DirectCastBody {
  type: 'direct-cast'
  data: {
    recipientFid: number
    message: string
    idempotencyKey: string
  }
}

/**
 * Normalizes unknown error values to Error instances for consistent logging.
 * @param error - The caught error or value thrown.
 * @returns An Error instance representing the failure.
 */
function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

/**
 * A function to calculate the exponential backoff delay.
 * @param attempts - The number of attempts or retries that have been made.
 * @param baseDelaySeconds - The base delay in seconds for the initial attempt.
 * @returns The calculated delay in seconds based on the number of attempts.
 */
const calculateExponentialBackoff = (
  attempts: number,
  baseDelaySeconds: number,
) => {
  return baseDelaySeconds ** attempts
}

/**
 * Handles the "like" reaction task for a given cast.
 * @param env - The environment configuration object.
 * @param data - The data associated with the reaction, containing the hash of the cast.
 * @returns A Promise that resolves when the "like" reaction has been processed successfully, or rejects with an error.
 */
async function handleLikeTask(env: Env, data: ReactionBody['data']) {
  const { hash } = data

  try {
    const result = await likeCast(env, hash)

    logger.info({ hash, result }, 'Like applied successfully to cast.')
  } catch (error) {
    const normalizedError = normalizeError(error)
    logger.error({ hash, error: normalizedError }, 'Failed to apply like to cast.')
    throw normalizedError
  }
}

/**
 * Handles the task of recasting by applying a reaction to a specific cast.
 * @param env - The environment configuration that contains necessary settings and credentials.
 * @param data - The data object which includes details about the reaction to be applied, specifically the hash of the cast.
 * @returns - A promise that resolves when the reaction is successfully applied or rejects with an error if it fails.
 */
async function handleRecastTask(env: Env, data: ReactionBody['data']) {
  const { hash } = data

  try {
    const result = await recast(env, hash)

    logger.info({ hash, result }, 'Recast applied successfully to cast.')
  } catch (error) {
    const normalizedError = normalizeError(error)
    logger.error(
      { hash, error: normalizedError },
      'Failed to apply recast to cast.',
    )
    throw normalizedError
  }
}

/**
 * Handles the task of sending a direct cast message.
 * @param env - The environment configuration object.
 * @param data - The data for the direct cast message, including recipient ID, message content, and idempotency key.
 * @returns A promise that resolves when the direct cast task is completed.
 */
async function handleDirectCastTask(env: Env, data: DirectCastBody['data']) {
  const { recipientFid, message: castMessage, idempotencyKey } = data

  logger.info({ recipientFid, idempotencyKey }, 'Sending direct cast message.')

  try {
    const result = await sendDirectCast(
      env,
      recipientFid,
      castMessage,
      idempotencyKey,
    )

    if (!result.success) {
      throw new Error(`Non-successful result: ${JSON.stringify(result)}`)
    }

    logger.info({ recipientFid, result }, 'Direct cast sent successfully.')
  } catch (error) {
    const normalizedError = normalizeError(error)
    logger.error(
      { recipientFid, error: normalizedError },
      'Failed to send direct cast message.',
    )
    throw normalizedError
  }
}

/**
 * Processes a message and handles tasks based on its type.
 * @param env - The environment configuration object used for task handling.
 * @param message - The message object containing the type and data to be processed.
 * @returns A promise that resolves when the message processing is complete.
 */
async function processMessage(env: Env, message: Message) {
  // @ts-expect-error: A message body type might not have a clear structure
  const { type, data } = message.body

  switch (type) {
    case 'like':
      await handleLikeTask(env, data as ReactionBody['data'])
      break
    case 'recast':
      await handleRecastTask(env, data as ReactionBody['data'])
      break
    case 'direct-cast':
      await handleDirectCastTask(env, data as DirectCastBody['data'])
      break

    default:
      logger.error({ type }, 'Unknown task type received.')
  }
}

/**
 * Handles incoming messages in a queue and processes them based on their
 * message type, with acknowledgment and retry logic.
 * @param batch - The batch of messages to process.
 * @param env - The environment context for the handler.
 * @param _ctx - The execution context for managing async operations.
 * @returns A promise that resolves when all messages in the batch have been
 *   processed and acknowledged.
 */
export async function queueHandler(
  batch: MessageBatch,
  env: Env,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx: ExecutionContext,
) {
  logger.info({ batchSize: batch.messages.length }, 'Processing message batch.')

  for (const message of batch.messages) {
    try {
      await processMessage(env, message)

      // Acknowledge the message after successful processing
      message.ack()
      logger.info(
        { messageId: message.id },
        'Message acknowledged successfully.',
      )
    } catch (error) {
      const normalizedError = normalizeError(error)
      logger.error(
        {
          messageId: message.id,
          error: normalizedError,
          attempts: message.attempts,
        },
        'Error processing message, retrying...',
      )

      // Retry the message in case of failure
      message.retry({
        delaySeconds: calculateExponentialBackoff(message.attempts, 10),
      })
    }
  }
}
