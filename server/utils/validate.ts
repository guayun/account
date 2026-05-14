export function isEmpty(str: any) {
    return str === null || str === undefined || str === ''
}

export function isTel(str: string): boolean {
    return /^1[3-9]\d{9}$/.test(str)
}

export function isEmail(str: string): boolean {
    return /^[a-zA-Z0-9_-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(str)
}

export function isStrongPassword(password: string): boolean {
    const lengthCheck = password.length >= 8
    const uppercaseCheck = /[A-Z]/.test(password)
    const lowercaseCheck = /[a-z]/.test(password)
    const numberCheck = /[0-9]/.test(password)
    const specialCharCheck = /[^A-Za-z0-9]/.test(password)

    return lengthCheck && uppercaseCheck && lowercaseCheck && numberCheck && specialCharCheck
}