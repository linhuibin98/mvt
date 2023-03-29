import http, { Server } from 'http'
import Koa from 'koa'
import chokidar, { FSWatcher } from 'chokidar'

import { hmrPlugin } from './serverPluginHmr'
import { moduleResolverPlugin } from './serverPluginModules'
import { vuePlugin } from './serverPluginVue'
import { servePlugin } from './serverPluginServe'

export interface PluginContext {
  root: string
  app: Koa
  server: Server
  watcher: FSWatcher
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
  servePlugin
]

export function createServer({
  root = process.cwd(),
  plugins = []
}: ServerConfig = {}): Server {
  const app = new Koa()
  const server = http.createServer(app.callback())
  const watcher = chokidar.watch(root, {
    ignored: [/node_modules/]
  })

  ;[...plugins, ...internalPlugins].forEach((m) =>
    m({
      root,
      app,
      server,
      watcher
    })
  )

  return server
}
