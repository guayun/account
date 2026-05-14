import jwt from 'jsonwebtoken'
import sql from '~/server/utils/database'
import { useRedis } from '~/server/utils/redis'
import { logsCreate } from '~/server/utils/logs'
import { isEmpty } from '~/server/utils/validate'
import { sessionCreate } from '~/server/utils/jwt'
import { SIGNIN_STATUS } from '~/server/constants/status-codes'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const headers = await getRequestHeaders(event)
  const redis = await useRedis()

  const token = headers['authorization']
  const state = body.state
  const scope = body.scope
  const client_key = body.client_key
  const redirect_uri = body.redirect_uri

  const timestamp = Math.floor(Date.now() / 1000)
  const session_id = crypto.randomUUID()
  const jwt_id = crypto.randomUUID()
  const ip = clientIP(headers)
  const os = clientOS(headers)
  const location = await queryIP(ip)

  if (isEmpty(token)) return response(SIGNIN_STATUS.ERROR_TOKEN_HAS_EXPIRED, 'Token不能为空')
  if (isEmpty(client_key)) return response(SIGNIN_STATUS.ERROR_MISSING_CLIENT_KEY, '应用Client_key不能为空')
  if (isEmpty(redirect_uri)) return response(SIGNIN_STATUS.ERROR_MISSING_REDIRECT_URI, '回调Uri不能为空')

  let token_status
  let verify_token
  try {
    const verify_token_raw = jwt.verify(token, process.env.JWT_SECRET)
    token_status = true
    verify_token = verify_token_raw
  } catch (err) {
    token_status = false
  }
  if (!token_status) return response(SIGNIN_STATUS.ERROR_MISSING_REDIRECT_URI, 'token已失效')
  if (verify_token.exp <= timestamp) return response(SIGNIN_STATUS.ERROR_TOKEN_HAS_EXPIRED, 'token已过期')
  if (verify_token.data.status !== 'authorisation') return response(SIGNIN_STATUS.ERROR_TOKEN_HAS_EXPIRED, 'token状态不正确')

  const [application_info] = await sql`SELECT * FROM developers.applications WHERE client_key = ${client_key}`
  if (!application_info) return response(SIGNIN_STATUS.ERROR_APPLICATION_NOT_FOUND, '应用不存在')
  if (application_info.status === 1001) return response(SIGNIN_STATUS.ERROR_APPLICATION_DISABLED, '应用已被停用')
  if (application_info.status === 1002) return response(SIGNIN_STATUS.ERROR_APPLICATION_BANNED, '应用已被封禁')
  if (!application_info.callback_domain.includes(extractDomain(redirect_uri))) return response(SIGNIN_STATUS.ERROR_INVALID_CALLBACK_DOMAIN, '应用回调域名不合法')
  if (scope.filter(s => application_info.scope.includes(s)).length === 0) return response(SIGNIN_STATUS.ERROR_INVALID_SCOPE, '应用Scope不合法')

  const session_key = `SESSION:${verify_token.data.session_id.toUpperCase()}`
  const session_raw = await redis.get(session_key)
  const session = JSON.parse(session_raw)

  const [account_info] = await sql`SELECT * FROM accounts.users WHERE open_id = ${session.open_id}`

  const [application_authorisation] = await sql`SELECT * FROM accounts.logs WHERE open_id = ${account_info.open_id} AND client_key = ${client_key} AND type = 2002`
  if (application_authorisation) return response(SIGNIN_STATUS.ERROR_APPLICATION_HAS_BEEN_AUTHORIZED, '应用已被授权')

  const authorisation_logs_create = await logsCreate(account_info.open_id, client_key, 2002, '授权应用', location, ip, os)
  if (!authorisation_logs_create) return response(SIGNIN_STATUS.ERROR_DATABASE_FAILURE, '数据库错误')

  const fake_scope = application_info.scope.filter(s => !scope.includes(s))
  const authorisation_create = await sql`INSERT INTO accounts.authorisation (client_key, system_open_id, fake_scope) VALUES (${client_key}, ${account_info.open_id}, ${JSON.stringify(fake_scope)}::json) RETURNING id`
  if (!authorisation_create) return response(SIGNIN_STATUS.ERROR_DATABASE_FAILURE, '数据库错误')

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

  const signin_logs_create = await logsCreate(account_info.open_id, client_key, 2001, '登录账号', location, ip, os)
  if (!signin_logs_create) return response(SIGNIN_STATUS.ERROR_DATABASE_FAILURE, '数据库错误')

  if (account_info.email !== null) {
    const sendCode = await sendMail(account_info.email, '登录提醒', `您的账号于${extractData(timestamp)}在${location}的${os}登录。若非您本人操作，请立即修改密码。`)
    if (!sendCode) return response(SIGNIN_STATUS.ERROR_EMAIL_FAILURE, '邮件发送失败')
  }

  return response(SIGNIN_STATUS.SUCCESS, '授权成功', {
    token: session_create,
    redirect_uri: `${redirect_uri}${redirect_uri.includes('?') ? '&' : '?'}code=${authorisation_code}${state ? `&state=${state}` : ''}`
  })
})