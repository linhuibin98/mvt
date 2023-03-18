import fs from 'fs'

export function send(res, source, mime) {
    res.setHeader('Content-Type', mime)
    res.end(source)
}

export function sendJS(res, source) {
    send(res, source, 'application/javascript')
}

export function sendJSStream(res, file) {
    res.setHeader('Content-Type', 'application/javascript')
    const stream = fs.createReadStream(file)
    stream.on('open', () => {
        stream.pipe(res)
    })
    stream.on('error', (err) => {
        res.end(err)
    })
}
