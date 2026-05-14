import nodemailer from 'nodemailer'

export async function sendMail(account, subject, content) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    })
    const sendCode = await transporter.sendMail({
        from: `"呱呱云账号"<guaplus@aliyun.com>`,
        to: account,
        subject,
        html: content
    })
    if (!sendCode.messageId) return false
    return true
}

export async function sendSms(account, content) {
    const sendCode = await $fetch('https://api.smsbao.com/sms', {
        method: 'GET',
        params: {
            u: process.env.SMSBAO_USERNAME,
            p: process.env.SMSBAO_APIKEY,
            m: account,
            c: `【呱呱云账号】${content}`
        }
    })
    if (sendCode !== '0') return false
    return true
}