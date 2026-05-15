import Redis from 'ioredis'

// Redis is an in-memory database — we use it as a message broker
// meaning it holds the list of "jobs to do" that BullMQ workers pick up
// Think of it like a post office — producers drop off letters (jobs),
// workers pick them up and process them

// ioredis is the Node.js client library to talk to Redis

export const redis = new Redis(process.env.REDIS_URL!, {
  // If connection fails, retry 3 times before throwing
  // maxRetriesPerRequest: 3,
  
  // BullMQ recommends null for shared producer/worker connections
  maxRetriesPerRequest: null,
})

redis.on('connect', () => {
  console.log('Connected to Redis')
})

redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})