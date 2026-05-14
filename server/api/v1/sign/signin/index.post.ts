import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getRequestHeaders } from 'h3'
import sql from '~/server/utils/database'
import { useRedis } from '~/server/utils/redis'
import { logsCreate } from '~/server/utils/logs'
import { response } from '~/server/utils/response'
import { sessionCreate } from '~/server/utils/jwt'
import { sendMail } from '~/server/utils/send-message'
import { queryIP, queryDomain } from '~/server/utils/query'
import { clientIP, clientOS } from '~/server/utils/client-info'
import { SIGNIN_STATUS } from '~/server/constants/status-codes'
import { isEmpty, isTel, isEmail } from '~/server/utils/validate'
import { randomString, randomAvatar } from '~/server/utils/random'
import { extractDomain, extractData } from '~/server/utils/extract'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const headers = getRequestHeaders(event)

  const account = body.account
  const password = body.password
  const code = body.code
  const signin_method = body.signin_method
  const client_key = body.client_key
  const state = body.state
  const redirect_uri = body.redirect_uri
  const timestamp = Math.floor(Date.now() / 1000)
  const session_id = crypto.randomUUID()
  const jwt_id = crypto.randomUUID()
  const ip = clientIP(headers)
  const os = clientOS(headers)
  const location = await queryIP(ip)
  const redis = await useRedis()
  let account_info

  if (isEmpty(signin_method)) return response(SIGNIN_STATUS.ERROR_MISSING_LOGIN_METHOD, '登录方式不能为空')
  if (isEmpty(client_key)) return response(SIGNIN_STATUS.ERROR_MISSING_CLIENT_KEY, '应用Client_key不能为空')
  if (isEmpty(redirect_uri)) return response(SIGNIN_STATUS.ERROR_MISSING_REDIRECT_URI, '回调Uri不能为空')
  if (isEmpty(account)) return response(SIGNIN_STATUS.ERROR_MISSING_ACCOUNT, '账号不能为空')
  if (!isTel(account) && !isEmail(account)) return response(STATUS.ERROR_INVALID_ACCOUNT, '账号格式错误')


  const signin_count_key = `SIGNIN_COUNT:${account.toUpperCase()}`
  let signin_count_raw = await redis.get(signin_count_key)
  let signin_count = signin_count_raw ? JSON.parse(signin_count_raw) : null

  if (!signin_count || signin_count.expiration <= timestamp) {
    signin_count = {
      count: 0,
      expiration: timestamp + 5 * 60
    }
    const success = await redis.set(signin_count_key, JSON.stringify(signin_count))
    if (!success) return response(SIGNIN_STATUS.ERROR_REDIS_FAILURE, '数据库错误')
  }
  if (signin_count.count >= 5) {
    return response(SIGNIN_STATUS.ERROR_TRY_TOO_MANY_TIMES, '尝试登录次数过多 请5分钟后再试')
  }

  const [application_info] = await sql`SELECT * FROM developers.applications WHERE client_key = ${client_key}`
  if (!application_info) return response(SIGNIN_STATUS.ERROR_APPLICATION_NOT_FOUND, '应用不存在')
  if (application_info.status === 1001) return response(SIGNIN_STATUS.ERROR_APPLICATION_DISABLED, '应用已被停用')
  if (application_info.status === 1002) return response(SIGNIN_STATUS.ERROR_APPLICATION_BANNED, '应用已被封禁')
  if (!application_info.callback_domain.includes(extractDomain(redirect_uri))) return response(SIGNIN_STATUS.ERROR_INVALID_CALLBACK_DOMAIN, '应用回调域名不合法')

  const account_method = isEmail(account) ? 'email' : 'tel'
  const [found_account] = await sql`SELECT * FROM accounts.users WHERE ${sql(account_method)} = ${account}`
  if (found_account) account_info = found_account
  if (signin_method === 'pass') {
    if (isEmpty(password)) return response(SIGNIN_STATUS.ERROR_MISSING_PASSWORD, '密码不能为空')
    if (!account_info) return response(SIGNIN_STATUS.ERROR_ACCOUNT_NOT_FOUND, '账号不存在')
    if (!await bcrypt.compare(password, account_info.password)) {
      signin_count.count += 1
      const signin_count_create = await redis.set(signin_count_key, JSON.stringify(signin_count))
      if (!signin_count_create) return response(SIGNIN_STATUS.ERROR_REDIS_FAILURE, '数据库错误')
      return response(SIGNIN_STATUS.ERROR_PASSWORD_INCORRECT, '账号或密码错误')
    }
  }
  if (signin_method === 'code') {
    if (isEmpty(code)) return response(SIGNIN_STATUS.ERROR_MISSING_VERIFICATION_CODE, '验证码不能为空')
    const verify_code_key = `VERIFY_CODE:${account.toUpperCase()}`
    const verify_code_raw = await redis.get(verify_code_key)
    const verify_code = JSON.parse(verify_code_raw)
    if (!verify_code || verify_code.expiration <= timestamp || verify_code.code !== code) {
      signin_count.count += 1
      const signin_count_create = await redis.set(signin_count_key, JSON.stringify(signin_count))
      if (!signin_count_create) return response(SIGNIN_STATUS.ERROR_REDIS_FAILURE, '数据库错误')
      return response(SIGNIN_STATUS.ERROR_VERIFICATION_CODE_INVALID, '验证码错误或已过期')
    }
    const verify_code_delete = await redis.del(verify_code_key)
    if (verify_code_delete !== 1) return response(SIGNIN_STATUS.ERROR_REDIS_FAILURE, '数据库错误')
    if (!account_info) {
      [account_info] = await sql`INSERT INTO accounts.users (${sql(account_method)}, username, password, avatar) VALUES (${account}, ${`用户${randomString(4)}`}, ${await bcrypt.hash(randomString(32), 10)}, ${randomAvatar()}) RETURNING *`
      if (!account_info) return response(SIGNIN_STATUS.ERROR_DATABASE_FAILURE, '数据库错误')
      const logs_create = await logsCreate(account_info.open_id, client_key, 2000, '注册账号', location, ip, os)
      if (!logs_create) return response(SIGNIN_STATUS.ERROR_DATABASE_FAILURE, '数据库错误')
    }
  }

  const signin_count_delete = await redis.del(signin_count_key)
  if (signin_count_delete !== 1) return response(SIGNIN_STATUS.ERROR_REDIS_FAILURE, '数据库错误')

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