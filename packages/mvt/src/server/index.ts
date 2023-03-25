import http, { Server } from 'http'
import Koa from 'koa'

import { hmrMiddleware } from './middlewares/hmr'
import { moduleResolverMiddleware } from './middlewares/modules'
import { vueMiddleware } from './middlewares/vue'
import { historyFallbackMiddleware } from './middlewares/historyFallback'
import { serveMiddleware } from './middlewares/serve'

export interface MiddlewareCtx {
  root: string
  app: Koa
  server: Server
}

export type Middleware = (ctx: MiddlewareCtx) => void

export interface ServerConfig {
  root?: string
  middlewares?: Middleware[]
}

const middlewares: Middleware[] = [
  hmrMiddleware,
  moduleResolverMiddleware,
  vueMiddleware,
  historyFallbackMiddleware,
  serveMiddleware
]

export function createServer({
  root = process.cwd(),
  middlewares: userMiddlewares = []
}: ServerConfig = {}): Server {
  const app = new Koa()
  const server = http.createServer(app.callback())

  ;[...userMiddlewares, ...middlewares].forEach((m) =>
    m({
      root,
      app,
      server
    })
  )

  return server
}
