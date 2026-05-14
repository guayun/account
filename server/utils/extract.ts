export function extractDomain(url) {
    const { hostname } = new URL(url)
    return hostname
}

export function extractData(timestamp) {
    const date = new Date(timestamp * 1000)
    const dateString = date.toLocaleDateString().replace(/\//g, '-')
    const timeString = date.toTimeString().substr(0, 8)
    return dateString + ' ' + timeString
}