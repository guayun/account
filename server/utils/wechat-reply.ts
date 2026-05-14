import { sha1ForWeChat, aesEncrypt } from './wechat-crypto'

export function buildWechatReply(fromUser, toUser, content, nonce) {
    const replyPlainXml = `<xml>
        <ToUserName><![CDATA[${fromUser}]]></ToUserName>
        <FromUserName><![CDATA[${toUser}]]></FromUserName>
        <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
        <MsgType><![CDATA[text]]></MsgType>
        <Content><![CDATA[${content}]]></Content>
    </xml>`
    const encryptedReply = aesEncrypt(replyPlainXml, process.env.WECHAT_ENCODING_AES_KEY, process.env.WECHAT_APP_ID)
    const responseTimestamp = `${Math.floor(Date.now() / 1000)}`
    const responseSignature = sha1ForWeChat(process.env.WECHAT_TOKEN!, responseTimestamp, nonce, encryptedReply)
    return `<xml>
        <Encrypt><![CDATA[${encryptedReply}]]></Encrypt>
        <MsgSignature><![CDATA[${responseSignature}]]></MsgSignature>
        <TimeStamp>${responseTimestamp}</TimeStamp>
        <Nonce><![CDATA[${nonce}]]></Nonce>
    </xml>`
}
