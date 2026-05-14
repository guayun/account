export function clientIP(headers) {
    return headers['eo-connecting-ip'] || headers['cf-connecting-ip'] || headers['x-forwarded-for'] || '0.0.0.0'
}

export function clientOS(headers) {
    const userAgent = headers['user-agent'] || ''
    const osMatch = userAgent.match(/(Windows|Macintosh|X11|Linux|iPhone|iPad|iPod|Android|BlackBerry)/i)
    return osMatch ? osMatch[1] : 'Unknown'
}