import crypto from 'crypto'
import { H3Event } from 'h3'

export async function queryIP(ip: string): Promise<string> {
    const md5 = crypto.createHash('md5').update(`/ws/location/v1/ip?ip=${ip}&key=${process.env.TENCENT_MAP_KEY}${process.env.TENCENT_MAP_SECRET_KEY}`).digest('hex');
    const response = await $fetch(`https://apis.map.qq.com/ws/location/v1/ip?ip=${ip}&key=${process.env.TENCENT_MAP_KEY}&sig=${md5}`)
    if (response.status !== 0) return response.message
    const { nation, province, city, district } = response.result.ad_info
    return [nation, province, city, district].filter(Boolean).join('')
}

export function queryDomain(event: H3Event): string {
    const headers = event.node.req.headers
    const host = headers['x-forwarded-host'] || headers['host'] || 'localhost'
    const protocol = headers['x-forwarded-proto'] || 'http'
    return `${protocol}://${host}`
}