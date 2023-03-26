import http, { Server } from 'http'
import Koa from 'koa'

import { hmrPlugin } from './plugins/hmr'
import { moduleResolverPlugin } from './plugins/modules'
import { vuePlugin } from './plugins/vue'
import { historyFallbackPlugin } from './plugins/historyFallback'
import { servePlugin } from './plugins/serve'

export interface PluginContext {
  root: string
  app: Koa
  server: Server
}

export type Plugin = (ctx: PluginContext) => void

export interface ServerConfig {
  root?: string
  plugins?: Plugin[]
}

const internalPlugins: Plugin[] = [
  hmrPlugin,
  moduleResolverPlugin,
  vuePlugin,
  historyFallbackPlugin,
  servePlugin
]

export function createServer({
  root = process.cwd(),
  plugins = []
}: ServerConfig = {}): Server {
  const app = new Koa()
  const server = http.createServer(app.callback())

  ;[...plugins, ...internalPlugins].forEach((m) =>
    m({
      root,
      app,
      server
    })
  )

  return server
}
