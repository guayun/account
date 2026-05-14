import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { useRedis } from '~/server/utils/redis'
import { randomCode } from '~/server/utils/random'
import { response } from '~/server/utils/response'
import { sendMail, sendSms } from '~/server/utils/send-message'
import { SIGNIN_STATUS } from '~/server/constants/status-codes'
import { isEmail, isTel, isEmpty } from '~/server/utils/validate'



export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const redis = await useRedis()

    const account = body.account
    const lot_number = body.lot_number
    const captcha_output = body.captcha_output
    const pass_token = body.pass_token
    const gen_time = body.gen_time
    const captcha_id = body.captcha_id

    const timestamp = Math.floor(Date.now() / 1000)

    if (isEmpty(lot_number)) return response(SIGNIN_STATUS.ERROR_CAPTCHA_FAIL, '滑块验证失败')
    if (isEmpty(account)) return response(SIGNIN_STATUS.ERROR_MISSING_ACCOUNT, '账号不能为空')
    if (!isTel(account) && !isEmail(account)) return response(SIGNIN_STATUS.ERROR_INVALID_ACCOUNT, '账号格式错误')

    const geetest_sign = crypto.createHmac('sha256', process.env.GEETEST_KEY).update(lot_number, 'utf8').digest('hex')
    const geetest_captcha = await $fetch(`http://gcaptcha4.geetest.com/validate`, {
        method: 'GET',
        params: {
            lot_number: lot_number,
            captcha_output: captcha_output,
            pass_token: pass_token,
            gen_time: gen_time,
            captcha_id: captcha_id,
            sign_token: geetest_sign
        }
    })
    const geetest = JSON.parse(geetest_captcha)
    if (geetest.result !== 'success') return response(SIGNIN_STATUS.ERROR_CAPTCHA_FAIL, '滑块验证失败')

    const code_key = `VERIFY_CODE:${account.toUpperCase()}`
    const code_last = JSON.parse(await redis.get(code_key))
    if (code_last !== null) {
        if (code_last.expiration >= timestamp) return response(SIGNIN_STATUS.ERROR_TRY_TOO_MANY_TIMES, '请1分钟后再重发')
    }

    const code = randomCode(6)
    const expiration = timestamp + 1 * 60

    const code_create = await redis.set(code_key, `{"code": "${code}", "expiration": ${expiration} }`)
    if (code_create !== 'OK') return response(SIGNIN_STATUS.ERROR_REDIS_FAILURE, '数据库错误')

    const subject = '验证码'
    const content = `您的验证码是${code}，此验证码5分钟内有效，切勿泄露给他人。`

    if (isTel(account)) {
        const sendCode = await sendSms(account, content)
        if (!sendCode) return response(SIGNIN_STATUS.ERROR_EMAIL_FAILURE, '邮件发送失败')
    }
    if (isEmail(account)) {
        const sendCode = await sendMail(account, '验证码', content)
        if (!sendCode) return response(SIGNIN_STATUS.ERROR_EMAIL_FAILURE, '邮件发送失败')
    }
    return response(SIGNIN_STATUS.SUCCESS, '验证码发送成功')
})