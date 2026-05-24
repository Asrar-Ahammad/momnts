import Redis from 'ioredis'

// Redis is an in-memory database — we use it as a message broker
// meaning it holds the list of "jobs to do" that BullMQ workers pick up
// Think of it like a post office — producers drop off letters (jobs),
// workers pick them up and process them

// ioredis is the Node.js client library to talk to Redis

// Strip surrounding quotes if accidentally included in env var value
export const REDIS_URL = (process.env.REDIS_URL || '').replace(/^["']|["']$/g, '')
const isTls = REDIS_URL.startsWith('rediss://')

/**
 * Shared Redis connection options for Upstash compatibility.
 * Upstash drops idle connections — these settings ensure resilient reconnection.
 */
export const redisConnectionOptions = {
  maxRetriesPerRequest: null as null,
  ...(isTls ? { tls: {} } : {}),
  enableReadyCheck: false,
  // Keep TCP connection alive — prevents Upstash from dropping idle connections
  keepAlive: 10000,
  // Reconnect with exponential backoff, max 3 seconds
  retryStrategy(times: number) {
    return Math.min(times * 200, 3000)
  },
  // Auto-reconnect on ECONNRESET and similar read errors
  reconnectOnError(err: Error) {
    const targetErrors = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']
    return targetErrors.some(e => err.message.includes(e))
  },
}

export const redis = new Redis(REDIS_URL, redisConnectionOptions)

redis.on('connect', () => {
  console.log('Connected to Redis')
})

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message)
})

// Override duplicate to automatically attach error listeners to duplicated connections (e.g. BullMQ internals)
const originalDuplicate = redis.duplicate.bind(redis)
redis.duplicate = (options?: any) => {
  const dup = originalDuplicate(options)
  dup.on('error', (err) => {
    console.error('Duplicated Redis client connection error:', err.message)
  })
  return dup
}