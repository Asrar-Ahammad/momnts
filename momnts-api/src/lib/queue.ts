import { Queue } from 'bullmq'
import { redis } from './redis.js'

// A Queue is like a to-do list stored in Redis
// When a photo is uploaded, we add a job to this queue
// A separate worker process reads from this queue and does the heavy work
// (face detection, calling Python service)

// We define the queue once here and import it wherever we need to add jobs
export const photoQueue = new Queue('photo-processing', {
  // Tell BullMQ which Redis instance to use as the message broker
  connection: redis,

  // Default settings for every job added to this queue
  defaultJobOptions: {
    attempts: 3,        // retry failed jobs up to 3 times
    backoff: {
      type: 'exponential', // wait longer between each retry
      delay: 5000,         // start with 5 seconds, then 10s, then 20s
    },
    removeOnComplete: 100, // keep last 100 completed jobs for debugging
    removeOnFail: 50,      // keep last 50 failed jobs for debugging
  },
})

export const matchingQueue = new Queue('face-matching', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  }
})