import path from 'pathe'
import { getAssetPublicPath, registerAssets } from './buildPluginAsset'
import { loadPostcssConfig } from './config'

import type { Plugin } from 'rollup'

const debug = require('debug')('mvt:css')

const urlRE = /(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g

export const createBuildCssPlugin = (
  root: string,
  assetsDir: string,
  cssFileName: string,
  minify: boolean
): Plugin => {
  const styles: Map<string, string> = new Map()
  const assets = new Map()

  return {
    name: 'mvt:css',
    async transform(code, id) {
      if (id.endsWith('.css')) {
        // process url() - register referenced files as assets
        // and rewrite the url to the resolved public path
        if (urlRE.test(code)) {
          const fileDir = path.dirname(id)
          urlRE.lastIndex = 0
          let match
          let remaining = code
          let rewritten = ''
          while ((match = urlRE.exec(remaining))) {
            rewritten += remaining.slice(0, match.index)
            const [matched, before, rawUrl, after] = match
            const file = path.resolve(fileDir, rawUrl)
            const { fileName, content, url } = await getAssetPublicPath(
              file,
              assetsDir
            )
            assets.set(fileName, content)
            debug(`url(${rawUrl}) -> url(${url})`)
            rewritten += `${before}${url}${after}`
            remaining = remaining.slice(match.index + matched.length)
          }
          code = rewritten + remaining
        }

        // postcss
        const postcssConfig = await loadPostcssConfig(root)
        if (postcssConfig) {
          try {
            const result = await require('postcss')(
              postcssConfig.plugins
            ).process(code, {
              ...postcssConfig.options,
              from: id
            })
            code = result.css
          } catch (e) {
            console.error(`[mvt] error applying postcss transforms: `, e)
          }
        }

        styles.set(id, code)
        return '/* css extracted by mvt */'
      }
    },

    async generateBundle(_options, bundle) {
      let css = ''
      // finalize extracted css
      styles.forEach((s) => {
        css += s
      })
      // minify with cssnano
      if (minify) {
        css = (
          await require('postcss')([require('cssnano')]).process(css, {
            from: undefined
          })
        ).css
      }

      bundle[cssFileName] = {
        type: 'asset',
        fileName: cssFileName,
        name: cssFileName,
        source: css,
        needsCodeReference: true
      }

      registerAssets(assets, bundle)
    }
  }
}
