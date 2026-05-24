import Redis from 'ioredis'

// Redis is an in-memory database — we use it as a message broker
// meaning it holds the list of "jobs to do" that BullMQ workers pick up
// Think of it like a post office — producers drop off letters (jobs),
// workers pick them up and process them

// ioredis is the Node.js client library to talk to Redis

const isTls = process.env.REDIS_URL?.startsWith('rediss://')

export const redis = new Redis(process.env.REDIS_URL!, {
  // If connection fails, retry 3 times before throwing
  // maxRetriesPerRequest: 3,
  
  // BullMQ recommends null for shared producer/worker connections
  maxRetriesPerRequest: null,
  ...(isTls ? { tls: {} } : {}),
  enableReadyCheck: false,
})

redis.on('connect', () => {
  console.log('Connected to Redis')
})

redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})

// Override duplicate to automatically attach error listeners to duplicated connections (e.g. BullMQ internals)
const originalDuplicate = redis.duplicate.bind(redis)
redis.duplicate = (options?: any) => {
  const dup = originalDuplicate(options)
  dup.on('error', (err) => {
    console.error('Duplicated Redis client connection error:', err)
  })
  return dup
}