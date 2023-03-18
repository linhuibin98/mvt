import fs from 'fs'

import type { ServerResponse } from 'http'

export function send(res: ServerResponse, source: string, mime: string) {
  res.setHeader('Content-Type', mime)
  res.end(source)
}

export function sendJS(res: ServerResponse, source: string) {
  send(res, source, 'application/javascript')
}

export function sendJSStream(res: ServerResponse, file: string) {
  res.setHeader('Content-Type', 'application/javascript')
  const stream = fs.createReadStream(file)
  stream.on('open', () => {
    stream.pipe(res)
  })
  stream.on('error', (err) => {
    res.end(err)
  })
}
