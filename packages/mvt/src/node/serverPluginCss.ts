import { isImportRequest, readBody } from './utils'
import { hmrClientId } from './serverPluginHmr'
import hash from 'hash-sum'
import { loadPostcssConfig } from './config'

import type { Plugin } from './server'

export const cssPlugin: Plugin = ({ root, app, watcher, resolver }) => {
  app.use(async (ctx, next) => {
    await next()
    // handle .css imports
    // we rewrite it to JS that injects a <style> tag pointing to the same url
    // but with a `?raw` query which returns the actual css
    if (
      ctx.path.endsWith('.css') &&
      // note ctx.body could be null if upstream set status to 304
      ctx.body
    ) {
      if (
        isImportRequest(ctx) &&
        // skip raw requests
        !ctx.query.raw
      ) {
        // we rewrite it to JS that injects a <style> tag pointing to the same url
        // but with a `?raw` query which returns the actual css
        ctx.type = 'js'
        const id = JSON.stringify(hash(ctx.path))
        const rawPath = JSON.stringify(ctx.path + '?raw')
        ctx.body = `
  import { updateStyle } from "${hmrClientId}"\n
  updateStyle(${id}, ${rawPath})
  `.trim()
      } else {
        // plain css request, apply postcss transform
        const postcssConfig = await loadPostcssConfig(root)
        if (postcssConfig) {
          const css = await readBody(ctx.body)
          try {
            const result = await require('postcss')(
              postcssConfig.plugins
            ).process(css, {
              ...postcssConfig.options,
              from: resolver.requestToFile(ctx.path)
            })
            ctx.body = result.css
          } catch (e) {
            console.error(`[mvt] error applying postcss transforms: `, e)
          }
        }
      }
    }
  })

  // handle hmr
  watcher.on('change', (file) => {
    if (file.endsWith('.css')) {
      const publicPath = resolver.fileToRequest(file)
      const id = hash(publicPath)
      watcher.send({
        type: 'style-update',
        id,
        path: publicPath,
        timestamp: Date.now()
      })
    }
  })
}
