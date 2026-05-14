import Redis from 'ioredis'

let redis: Redis | null = null

const createRedisClient = () => {
  return new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
    retryStrategy: (times) => Math.min(times * 100, 2000),
  })
}

export const useRedis = () => {
  if (!redis) {
    redis = createRedisClient()
    redis.on('error', (err) => console.error('[Redis Error]', err))
  }
  return redis
}
