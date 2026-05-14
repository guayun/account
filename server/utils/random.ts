export function randomCode(length) {
    const chars = '0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

export function randomString(length) {
    const chars = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefhiklmnorstuvwxz'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

export function randomAvatar() {
    const urls = [
        'https://assets.guaplus.cn/tos-cn-i-v7fwg41dlf/585cbbd5344fdb8963329bdc50532115.jpg',
        'https://assets.guaplus.cn/tos-cn-i-v7fwg41dlf/f05a299c3a560efebc295a65849eeaa5.jpg',
        'https://assets.guaplus.cn/tos-cn-i-v7fwg41dlf/efd7438f96905de7dcd3b43de29240e2.jpg',
        'https://assets.guaplus.cn/tos-cn-i-v7fwg41dlf/1a0d12e7a366d481cb7e60c2b7bba222.jpg',
        'https://assets.guaplus.cn/tos-cn-i-v7fwg41dlf/da33de40d2ee7b68d4b266c538a43b3a.jpg',
        'https://assets.guaplus.cn/tos-cn-i-v7fwg41dlf/9aced7d24393c92d7cffcd219e014380.jpg'
    ]
    const index = Math.floor(Math.random() * urls.length)
    return urls[index]
}
