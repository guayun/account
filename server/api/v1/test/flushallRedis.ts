import { useRedis } from '~/server/utils/redis'
import { isEmpty } from '~/server/utils/validate'
import { response } from '~/server/utils/response'

export default defineEventHandler(async (event) => {
  const body = await getQuery(event)
  const key = body.key
  if (isEmpty(key)) return response(10000, 'key不能为空')
  if (key !== process.env.TEST_KEY) return response(10001, 'key错误')
  const redis = await useRedis()
  const res = await redis.flushall()
  return response(20000, '获取成功', {res})
})
