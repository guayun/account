export async function response(code: number, message: string, data: any = null) {
    return {
        status: code,
        message,
        ...(data ? { data } : {})
    }
}