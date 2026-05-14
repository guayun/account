import jwt from 'jsonwebtoken'
import sql from '~/server/utils/database'
import { useRedis } from '~/server/utils/redis'
import { isEmpty } from '~/server/utils/validate'
import { SIGNIN_STATUS } from '~/server/constants/status-codes'


export default defineEventHandler(async (event) => {
  const headers = getRequestHeaders(event)
  const body = await readBody(event)
  const redis = await useRedis()

  const token = headers['authorization']

  if (isEmpty(token)) return response(SIGNIN_STATUS.ERROR_TOKEN_HAS_EXPIRED, 'Token不能为空')

  let token_status
  let verify_token
  try {
    const verify_token_raw = jwt.verify(token, process.env.JWT_SECRET)
    token_status = true
    verify_token = verify_token_raw
  } catch (err) {
    token_status = false
  }
  if (!token_status) return response(SIGNIN_STATUS.ERROR_TOKEN_HAS_EXPIRED, 'Token已失效')

  const timestamp = Math.floor(Date.now() / 1000)
  if (verify_token.exp <= timestamp) return response(SIGNIN_STATUS.ERROR_TOKEN_HAS_EXPIRED, 'Token已过期')

  const session_key = `SESSION:${verify_token.data.session_id.toUpperCase()}`
  const session_raw = await redis.get(session_key)
  const session = JSON.parse(session_raw)
  const [user_info] = await sql`SELECT * FROM accounts.users WHERE open_id = ${session.open_id}`


  return response(SIGNIN_STATUS.SUCCESS, '获取成功', {
    username: user_info.username,
    avatar: user_info.avatar
  })
})
