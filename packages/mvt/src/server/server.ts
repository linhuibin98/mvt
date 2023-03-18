import { promises as fs } from 'fs'
import path from 'path'
import http from 'http'
import url from 'url'

import serve from 'serve-handler'
import { WebSocketServer, WebSocket } from 'ws'

import { vueMiddleware } from './middlewares/vue'
import { moduleMiddleware } from './middlewares/module'
import { sendJS } from './utils/index'
import { createFileWatcher } from './utils/hmrWatcher'
import { rewrite } from './utils/moduleRewriter'

import type { Server } from 'http'

export interface ServerConfig {
  port?: number
  cwd?: string
}

export async function createServer({
  port = 3000
}: ServerConfig = {}): Promise<Server> {
  const hmrClientCode = await fs.readFile(
    path.resolve(__dirname, '../client/client.js'),
    'utf-8'
  )
  const server = http.createServer(async (req, res) => {
    const pathname = url.parse(req.url!).pathname!
    if (pathname === '/__hmrClient') {
      return sendJS(res, hmrClientCode)
    } else if (pathname.startsWith('/__modules/')) {
      return moduleMiddleware(pathname.replace('/__modules/', ''), res)
    } else if (pathname.endsWith('.vue')) {
      return vueMiddleware(req, res)
    } else if (pathname.endsWith('.js')) {
      const filename = path.join(process.cwd(), pathname.slice(1))
      try {
        const content = await fs.readFile(filename, 'utf-8')
        return sendJS(res, rewrite(content))
      } catch (e) {
        if (e.code === 'ENOENT') {
          // fallthrough to serve-handler
        } else {
          console.error(e)
        }
      }
    }
    serve(req, res, {
      rewrites: [{ source: '**', destination: '/index.html' }]
    })
  })

  const wss = new WebSocketServer({ server })
  const sockets = new Set<WebSocket>()

  wss.on('connection', (socket) => {
    sockets.add(socket)
    socket.send(JSON.stringify({ type: 'connected' }))
    socket.on('close', () => {
      sockets.delete(socket)
    })
  })

  wss.on('error', (e: Error & { code: string }) => {
    if (e.code !== 'EADDRINUSE') {
      console.error(e)
    }
  })

  createFileWatcher((payload) =>
    sockets.forEach((s) => s.send(JSON.stringify(payload)))
  )

  return new Promise((resolve, reject) => {
    server.on('error', (e: Error & { code: string }) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`port ${port} is in use, trying another one...`)
        setTimeout(() => {
          server.close()
          server.listen(++port)
        }, 100)
      } else {
        console.error(e)
        reject(e)
      }
    })

    server.on('listening', () => {
      console.log(`Running at http://localhost:${port}`)
      resolve(server)
    })

    server.listen(port)
  })
}
