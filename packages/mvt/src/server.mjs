import fs from 'fs'
import path from 'path'
import http from 'http'
import url from 'url';

import serve from 'serve-handler'
import { WebSocketServer } from 'ws'

import { vueMiddleware } from './middlewares/vue.mjs'
import { moduleMiddleware } from './middlewares/module.mjs'

import { sendJS } from './utils/index.mjs'
import { createFileWatcher } from './utils/hmrWatcher.mjs'
import { rewrite } from './utils/moduleRewriter.mjs'

const hmrClientCode = fs.readFileSync(path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), './client/hmrClient.js'), 'utf-8')

const server = http.createServer((req, res) => {
    const pathname = url.parse(req.url).pathname
    if (pathname === '/__hmrClient') {
        return sendJS(res, hmrClientCode)
    } else if (pathname.startsWith('/__modules/')) {
        return moduleMiddleware(pathname.replace('/__modules/', ''), res)
    } else if (pathname.endsWith('.vue')) {
        return vueMiddleware(req, res)
    } else if (pathname.endsWith('.js')) {
        const filename = path.join(process.cwd(), pathname.slice(1))
        if (fs.existsSync(filename)) {
            const content = rewrite(fs.readFileSync(filename, 'utf-8'))
            return sendJS(res, content)
        }
    }
    serve(req, res, {
        rewrites: [{ source: '**', destination: '/index.html' }]
    })
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
// TODO customized port
server.listen(3000, () => {
    console.log('Running at http://localhost:3000')
})

