import crypto from 'crypto'

export function sha1ForWeChat(...parts: string[]) {
    const arr = parts.slice().sort()
    const sh = crypto.createHash('sha1')
    sh.update(arr.join(''))
    return sh.digest('hex')
}

function pkcs7Encode(buf: Buffer) {
    const blockSize = 32
    const pad = blockSize - (buf.length % blockSize)
    const padBuf = Buffer.alloc(pad, pad)
    return Buffer.concat([buf, padBuf])
}

function pkcs7Decode(buf: Buffer) {
    const pad = buf[buf.length - 1]
    if (pad < 1 || pad > 32) return buf
    return buf.slice(0, buf.length - pad)
}

function getAesKey(encodingAesKey: string) {
    let k = encodingAesKey
    const pad = (4 - (k.length % 4)) % 4
    if (pad) k += '='.repeat(pad)
    return Buffer.from(k, 'base64')
}

export function aesDecrypt(encryptBase64: string, encodingAesKey: string) {
    const AESKey = getAesKey(encodingAesKey)
    const iv = AESKey.slice(0, 16)
    const decipher = crypto.createDecipheriv('aes-256-cbc', AESKey, iv)
    decipher.setAutoPadding(false)
    const encrypted = Buffer.from(encryptBase64, 'base64')
    let decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    decrypted = pkcs7Decode(decrypted)
    const content = decrypted.slice(16)
    const msgLen = content.readUInt32BE(0)
    const xmlMsg = content.slice(4, 4 + msgLen).toString('utf8')
    const appid = content.slice(4 + msgLen).toString('utf8')
    return { xml: xmlMsg, appid }
}

export function aesEncrypt(replyXml: string, encodingAesKey: string, appId: string) {
    const AESKey = getAesKey(encodingAesKey)
    const iv = AESKey.slice(0, 16)
    const random16 = crypto.randomBytes(16)
    const msgBuf = Buffer.from(replyXml, 'utf8')
    const lenBuf = Buffer.alloc(4)
    lenBuf.writeUInt32BE(msgBuf.length, 0)
    const appidBuf = Buffer.from(appId, 'utf8')
    const raw = Buffer.concat([random16, lenBuf, msgBuf, appidBuf])
    const padded = pkcs7Encode(raw)
    const cipher = crypto.createCipheriv('aes-256-cbc', AESKey, iv)
    cipher.setAutoPadding(false)
    const encrypted = Buffer.concat([cipher.update(padded), cipher.final()])
    return encrypted.toString('base64')
}