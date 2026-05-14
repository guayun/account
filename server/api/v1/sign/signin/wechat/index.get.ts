import crypto from 'crypto'
import { getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const { signature, timestamp, nonce, echostr } = getQuery(event)
  const calculatedSignature = crypto.createHash('sha1').update([process.env.WECHAT_TOKEN, timestamp, nonce].sort().join('')).digest('hex')
  if (calculatedSignature === signature) {
    return echostr
  }
  return 'fuck wechat'
})