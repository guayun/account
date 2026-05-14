import sql from '~/server/utils/database'
import { isEmpty } from '~/server/utils/validate'
import { SIGNIN_STATUS } from '~/server/constants/status-codes'

export default defineEventHandler(async (event) => {
    const body = await getQuery(event)
    const state = body.state
    const client_key = body.client_key
    const redirect_uri = body.redirect_uri

    if (isEmpty(client_key)) return response(SIGNIN_STATUS.ERROR_MISSING_CLIENT_KEY, '应用Client_key不能为空')
    if (isEmpty(redirect_uri)) return response(SIGNIN_STATUS.ERROR_MISSING_REDIRECT_URI, '回调Uri不能为空')

    const [application_info] = await sql`SELECT * FROM developers.applications WHERE client_key = ${client_key}`
    if (!application_info) return response(SIGNIN_STATUS.ERROR_APPLICATION_NOT_FOUND, '应用不存在')
    if (application_info.status === 1001) return response(SIGNIN_STATUS.ERROR_APPLICATION_DISABLED, '应用已被停用')
    if (application_info.status === 1002) return response(SIGNIN_STATUS.ERROR_APPLICATION_BANNED, '应用已被封禁')
    if (!application_info.callback_domain.includes(extractDomain(redirect_uri))) return response(SIGNIN_STATUS.ERROR_INVALID_CALLBACK_DOMAIN, '应用回调域名不合法')

    return response(SIGNIN_STATUS.SUCCESS, '获取成功', {
        client_key: application_info.client_key,
        name: application_info.application_name,
        status: application_info.status,
        bg_url: application_info.signin_background,
        text_color: application_info.signin_text_color,
        notice: application_info.notice,
        policy: application_info.policy,
        terms: application_info.terms,
        scope: application_info.scope
    })
})