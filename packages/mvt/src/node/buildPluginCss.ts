import type { Plugin } from 'rollup'

export const createBuildCssPlugin = (
  cssFileName: string,
  minify: boolean
): Plugin => {
  const styles: Map<string, string> = new Map()

  return {
    name: 'mvt:css',
    transform(code, id) {
      if (id.endsWith('.css')) {
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
    }
  }
}
