import sql from '~/server/utils/database'
import { useRedis } from '~/server/utils/redis'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const redis = await useRedis()

    /**
     * 获取 Code
     */
    const sign_code_raw = await redis.get(
        `SIGNIN_CODE:${String(query.code).toUpperCase()}`
    )

    if (!sign_code_raw) {
        return {
            code: 401,
            message: 'Code已过期'
        }
    }

    const sign_code = JSON.parse(sign_code_raw)

    /**
     * 校验应用
     */
    const [application_info] = await sql`
        SELECT *
        FROM developers.applications
        WHERE client_key = ${query.client_key}
        AND client_secret = ${query.client_secret}
        LIMIT 1
    `

    if (!application_info) {
        return {
            code: 401,
            message: '应用不存在'
        }
    }

    /**
     * 获取授权信息
     */
    const [authorisation_info] = await sql`
        SELECT *
        FROM accounts.authorisation
        WHERE client_key = ${application_info.client_key}
        AND system_open_id = ${sign_code.open_id}
        LIMIT 1
    `

    /**
     * 获取真实用户信息
     */
    const [user_info] = await sql`
        SELECT *
        FROM accounts.users
        WHERE open_id = ${sign_code.open_id}
        LIMIT 1
    `

    /**
     * scope
     */
    const application_scope =
        application_info.scope || []

    const fake_scope =
        authorisation_info.fake_scope || []

    const data: Record<string, any> = {}
    data.openid = authorisation_info.application_open_id

    if (fake_scope.includes('avatar')) {
        data.avatar = 'https://cdn.idnest.cn/avatar/default.png'
    } else {
        data.avatar = user_info.avatar
    }

    if (fake_scope.includes('username')) {
        data.username = 'IDNest用户'
    } else {
        data.username = user_info.username
    }

    if (fake_scope.includes('tel')) {
        data.tel = '138****0000'
    } else {
        data.tel = user_info.tel
    }

    if (fake_scope.includes('email')) {
        data.email = 'user@idnest.cn'
    } else {
        data.email = user_info.email
    }

    if (fake_scope.includes('is_realname')) {
        data.is_realname = false
    } else {
        data.is_realname = !!user_info.real_name?.trim()
    }

    return {
        code: 200,
        data
    }
})