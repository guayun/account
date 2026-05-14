import { useRedis } from '~/server/utils/redis'
import { randomCode } from '~/server/utils/random'
import { SIGNIN_STATUS } from '~/server/constants/status-codes'

export default defineEventHandler(async (event) => {
  const redis = await useRedis()
  const code = randomCode(6)
  const timestamp = Math.floor(Date.now() / 1000)
  const expiration = timestamp + 1 * 60

  const code_create = await redis.set(`WECHAT_SIGNIN:${code}`, `{"open_id": null,"expiration": ${expiration} }`)
  if (code_create !== 'OK') return response(SIGNIN_STATUS.ERROR_REDIS_FAILURE, '数据库错误')
  return response(SIGNIN_STATUS.SUCCESS, '获取成功', { code })
})
