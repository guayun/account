import crypto from 'crypto'
import { isEmpty } from '~/server/utils/validate'
import { sessionCreate } from '~/server/utils/jwt'
import { response } from '~/server/utils/response'

export default defineEventHandler(async (event) => {
  const body = await getQuery(event)
  const key = body.key
  const func = body.function
  const open_id = body.open_id
  const expiration = body.expiration

  if (isEmpty(key)) return response(10000, 'key不能为空')
  if (key !== process.env.TEST_KEY) return response(10001, 'key错误')
  if (isEmpty(func)) return response(10000, 'function不能为空')
  if (isEmpty(open_id)) return response(10000, 'open_id不能为空')
  if (isEmpty(expiration)) return response(10000, 'expiration不能为空')

  const session_id = crypto.randomUUID()
  const jwt_id = crypto.randomUUID()
  let name

  switch (body.func) {
    case 'a':
      name = 'authorisation'
      break;
    case 't':
      name = 'two_factor'
      break;
    case 'n':
      name = 'normal'
      break;
  }

  const token = await sessionCreate(name, session_id, jwt_id, open_id, expiration)
  return response(20000, '获取成功', {token})
})
