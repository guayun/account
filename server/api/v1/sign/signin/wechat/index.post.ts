import { parseStringPromise } from 'xml2js'
import { useRedis } from '~/server/utils/redis'
import { getQuery, setResponseHeader, readRawBody } from 'h3'
import { buildWechatReply } from '~/server/utils/wechat-reply'
import { sha1ForWeChat, aesDecrypt } from '~/server/utils/wechat-crypto'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Content-Type', 'application/xml')
  const { msg_signature, timestamp, nonce } = getQuery(event)
  const rawBody = await readRawBody(event, 'utf8')
  if (!rawBody) return 'success'
  const { xml: { Encrypt: encryptedMessage } } = await parseStringPromise(rawBody, { explicitArray: false })
  if (!encryptedMessage) return 'success'
  const expectedSignature = sha1ForWeChat(process.env.WECHAT_TOKEN, timestamp, nonce, encryptedMessage)
  if (msg_signature !== expectedSignature) return 'success'

  const { xml: innerXmlString } = aesDecrypt(encryptedMessage, process.env.WECHAT_ENCODING_AES_KEY)
  const { xml: message } = await parseStringPromise(innerXmlString, { explicitArray: false })
  const { FromUserName: fromUser, ToUserName: toUser, Content: content } = message

  if (!/^\d{6}$/.test(content)) {
    return buildWechatReply(fromUser, toUser, '验证码格式错误，请重新输入。', nonce)
  }

  const redis = await useRedis()
  const verifyCodeKey = `WECHAT_SIGNIN:${content}`
  const verifyCodeRaw = await redis.get(verifyCodeKey)
  const verifyCode = verifyCodeRaw ? JSON.parse(verifyCodeRaw) : null
  if (!verifyCode || verifyCode.expiration <= timestamp || verifyCode.open_id) {
    return buildWechatReply(fromUser, toUser, '验证码错误或已过期，请刷新页面重新获取。', nonce)
  }

  verifyCode.open_id = fromUser
  await redis.set(verifyCodeKey, JSON.stringify(verifyCode))

  return buildWechatReply(fromUser, toUser, '验证成功，请返回页面继续操作。', nonce)
})