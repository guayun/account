import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import sql from '~/server/utils/database'
import { useRedis } from '~/server/utils/redis'
import { logsCreate } from '~/server/utils/logs'
import { response } from '~/server/utils/response'
import { sendMail } from '~/server/utils/send-message'
import { queryIP, queryDomain } from '~/server/utils/query'
import { SIGNIN_STATUS } from '~/server/constants/status-codes'
import { clientIP, clientOS } from '~/server/utils/client-info'
import { randomString, randomAvatar } from '~/server/utils/random'

export default defineEventHandler(async (event) => {
  const redis = await useRedis()
  const body = await readBody(event)
  const headers = getRequestHeaders(event)

  const code = body.code
  const client_key = body.client_key
  const state = body.state
  const redirect_uri = body.redirect_uri
  const ip = clientIP(headers)
  const os = clientOS(headers)
  const location = await queryIP(ip)
  const timestamp = Math.floor(Date.now() / 1000)
  const session_id = crypto.randomUUID()
  const jwt_id = crypto.randomUUID()

  if (isEmpty(code)) return response(SIGNIN_STATUS.ERROR_MISSING_CODE, 'Code不能为空')

  const [application_info] = await sql`SELECT * FROM developers.applications WHERE client_key = ${client_key}`
  if (!application_info) return response(SIGNIN_STATUS.ERROR_APPLICATION_NOT_FOUND, '应用不存在')
  if (application_info.status === 1001) return response(SIGNIN_STATUS.ERROR_APPLICATION_DISABLED, '应用已被停用')
  if (application_info.status === 1002) return response(SIGNIN_STATUS.ERROR_APPLICATION_BANNED, '应用已被封禁')
  if (!application_info.callback_domain.includes(extractDomain(redirect_uri))) return response(SIGNIN_STATUS.ERROR_INVALID_CALLBACK_DOMAIN, '应用回调域名不合法')

  const code_key = `WECHAT_SIGNIN:${code}`
  const code_raw = JSON.parse(await redis.get(code_key))

  let account_info
  [account_info] = await sql`SELECT * FROM accounts.users WHERE social_open_id ->> 'wechat' = ${code_raw.open_id}`
  if (!account_info) {
    [account_info] = await sql`INSERT INTO accounts.users (username, password, avatar, social_open_id) VALUES (${`用户${randomString(4)}`}, ${await bcrypt.hash(randomString(32), 10)},${randomAvatar()} , json_build_object('wechat', ${sql`${code_raw.open_id}::text`})) RETURNING *`
    const logs_create = await logsCreate(account_info.open_id, client_key, 2000, '注册账号', location, ip, os)
    if (!logs_create) return response(SIGNIN_STATUS.ERROR_DATABASE_FAILURE, '数据库错误')
  }
  const code_raw_delete = await redis.del(code_key)
  if (code_raw_delete !== 1) return response(SIGNIN_STATUS.ERROR_REDIS_FAILURE, '数据库错误')

  if (account_info.status === 1001) return response(SIGNIN_STATUS.ERROR_ACCOUNT_BANNED, '账号已封禁')
  if (account_info.status === 1002) return response(SIGNIN_STATUS.ERROR_ACCOUNT_FROZEN, '账号已冻结')
  if (account_info.status === 1003) return response(SIGNIN_STATUS.ERROR_ACCOUNT_PENDING_DELETION, '账号进入注销冷静期')

  if (account_info.two_factor_secret !== null) {
    const session_create = await sessionCreate('two_factor', session_id, jwt_id, account_info.open_id, '5m')
    if (!session_create) return response(SIGNIN_STATUS.ERROR_SESSION_CREATE, 'session创建失败')
    return response(SIGNIN_STATUS.REQUIRE_TWO_FACTOR, '请先完成两步验证', {
      token: session_create,
      redirect_uri: `${queryDomain(event)}/sign/twofactor?client_key=${client_key}&redirect_uri=${redirect_uri}${state ? `&state=${state}` : ''}`
    })
  }

  const [application_authorisation] = await sql`SELECT * FROM accounts.logs WHERE open_id = ${account_info.open_id} AND client_key = ${client_key} AND type = 2002`
  if (!application_authorisation) {
    const session_create = await sessionCreate('authorisation', session_id, jwt_id, account_info.open_id, '5m')
    if (!session_create) return response(SIGNIN_STATUS.ERROR_SESSION_CREATE, 'session创建失败')
    return response(SIGNIN_STATUS.REQUIRE_APPLICATION_AUTH, '请先完成应用授权', {
      token: session_create,
      redirect_uri: `${queryDomain(event)}/sign/authorisation?client_key=${client_key}&redirect_uri=${redirect_uri}${state ? `&state=${state}` : ''}`
    })
  }

  const authorisation_code = randomString(32)
  const authorisation_code_create = await redis.set(`SIGNIN_CODE:${authorisation_code.toUpperCase()}`, JSON.stringify({
    open_id: account_info.open_id,
    authorisation_code,
    client_key,
    expiration: timestamp + 60
  }))
  if (authorisation_code_create !== 'OK') return response(SIGNIN_STATUS.ERR_REDIS_FAIL, '数据库错误')

  const session_create = await sessionCreate('normal', session_id, jwt_id, account_info.open_id, '1h')
  if (!session_create) return response(SIGNIN_STATUS.ERROR_SESSION_CREATE, 'session创建失败')

  const logs_create = await logsCreate(account_info.open_id, client_key, 2001, '登录账号', location, ip, os)
  if (!logs_create) return response(SIGNIN_STATUS.ERROR_DATABASE_FAILURE, '数据库错误')

  if (account_info.email !== null) {
    const sendCode = await sendMail(account_info.email, '登录提醒', `您的账号于${extractData(timestamp)}在${location}的${os}登录。若非您本人操作，请立即修改密码。`)
    if (!sendCode) return response(SIGNIN_STATUS.ERROR_EMAIL_FAILURE, '邮件发送失败')
  }

  return response(SIGNIN_STATUS.SUCCESS, '登录成功', {
    token: session_create,
    redirect_uri: `${redirect_uri}${redirect_uri.includes('?') ? '&' : '?'}code=${authorisation_code}${state ? `&state=${state}` : ''}`
  })
})