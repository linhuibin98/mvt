import type { Plugin } from '../index'

export const servePlugin: Plugin = ({ root, app }) => {
  app.use(require('koa-conditional-get')())
  app.use(require('koa-etag')())
  app.use(require('koa-static')(root))
}
