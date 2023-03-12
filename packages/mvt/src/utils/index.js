
export function send(res, source, mime) {
    res.setHeader('Content-Type', mime)
    res.end(source)
}

export function sendJS(res, source) {
    send(res, source, 'application/javascript')
}
