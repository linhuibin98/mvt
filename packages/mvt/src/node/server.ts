import http, { Server } from 'http'
import Koa from 'koa'
import chokidar, { FSWatcher } from 'chokidar'
import { createResolver } from './resolver'

import { hmrPlugin } from './serverPluginHmr'
import { modulesPlugin } from './serverPluginModules'
import { vuePlugin } from './serverPluginVue'
import { servePlugin } from './serverPluginServe'

import type { Resolver, InternalResolver } from './resolver'

export { Resolver }

export type ViteWatcher = FSWatcher & {
  handleVueReload: (file: string, timestamp: number, content?: string) => void
  handleJSReload: (file: string, timestamp: number) => void
}

export interface PluginContext {
  root: string
  app: Koa
  server: Server
  watcher: ViteWatcher
  resolver: InternalResolver
}

export type Plugin = (ctx: PluginContext) => void

export interface ServerConfig {
  root?: string
  plugins?: Plugin[]
  resolvers?: Resolver[]
}

const internalPlugins: Plugin[] = [
  hmrPlugin,
  modulesPlugin,
  vuePlugin,
  servePlugin
]

export function createServer(config: ServerConfig = {}): Server {
  const { root = process.cwd(), plugins = [], resolvers = [] } = config
  const app = new Koa()
  const server = http.createServer(app.callback())
  const watcher = chokidar.watch(root, {
    ignored: [/node_modules/]
  }) as ViteWatcher
  const resolver = createResolver(root, resolvers)

  ;[...plugins, ...internalPlugins].forEach((m) =>
    m({
      root,
      app,
      server,
      watcher,
      resolver
    })
  )

  return server
}
