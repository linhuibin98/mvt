import fs from 'fs'
import path from 'path'
import http from 'http'
import url from 'url';

import serve from 'serve-handler'
import {WebSocketServer} from 'ws'

import { vueMiddleware } from './middlewares/vue.js'
import { sendJS } from './utils/index.js'
import { createFileWatcher } from './utils/fileWatcher.js'

const hmrProxy = fs.readFileSync(path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), './client/hmrProxy.js'), 'utf-8')

const server = http.createServer((req, res) => {
    const pathname = url.parse(req.url).pathname
    if (pathname === '/__hmrProxy') {
        sendJS(res, hmrProxy)
    } else if (pathname.endsWith('.vue')) {
        vueMiddleware(req, res)
    } else {
        serve(req, res)
    }

})

const wss = new WebSocketServer({ server })
const sockets = new Set()
wss.on('connection', (socket) => {
    sockets.add(socket)
    socket.send(JSON.stringify({ type: 'connected' }))
    socket.on('close', () => {
        sockets.delete(socket)
    })
})

createFileWatcher((payload) =>
    sockets.forEach((s) => s.send(JSON.stringify(payload)))
)

server.listen(3000, () => {
    console.log('Running at http://localhost:3000')
})

