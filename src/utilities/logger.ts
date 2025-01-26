import { LoggerOptions, pino } from 'pino'

interface LogObject {
  level: number
  time: number
  msg: string
  [key: string]: unknown
}

/**
 * The `replacer` method is used to replace BigInt values with their corresponding Number values.
 * @param key - The key of the property being processed.
 * @param value - The value of the property being processed.
 * @returns - The replacement value for the property. If it is a BigInt, then it is converted to a Number.
 */
function replacer(key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number(value)
  }
  return value
}

/**
 * Formats the log object into a custom log string.
 * @param log - The log object to be formatted.
 * @returns The formatted log string.
 */
function customFormatter(log: LogObject): string {
  const { level, msg, time, ...rest } = log
  const timestamp = new Date(time).toISOString()
  const levelName = pino.levels.labels[level].toUpperCase()

  // Format the additional data (if any)
  const additionalData = Object.keys(rest).length
    ? ` ${JSON.stringify(rest, replacer)}`
    : ''

  return `${timestamp} [${levelName}]: ${msg}${additionalData}`
}

const loggerOptions: LoggerOptions = {
  ...(process.env.NODE_ENV === 'development' && {
    browser: {
      asObject: true,
      write: (o) => {
        console.log(customFormatter(o as LogObject))
      },
    },
  }),
  ...(process.env.NODE_ENV === 'production' && {
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
  serializers: pino.stdSerializers,
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'development' ? 'trace' : 'info'),
}

export const logger = pino(loggerOptions)
