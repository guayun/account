import jwt from 'jsonwebtoken'
import { useRedis } from '~/server/utils/redis'

export async function sessionCreate(status, session_id, jwt_id, open_id, expiration) {
    const redis = await useRedis()
    const token = jwt.sign({
        data: {
            status: status,
            session_id: session_id
        }
    }, process.env.JWT_SECRET, {
        expiresIn: expiration,
        jwtid: jwt_id
    })
    const session_create = await redis.set(`SESSION:${session_id.toUpperCase()}`, JSON.stringify({
        status: status,
        open_id: open_id,
        session_id: session_id,
        jwt_id: jwt_id
    }))
    if (session_create !== 'OK') return false
    return token
}