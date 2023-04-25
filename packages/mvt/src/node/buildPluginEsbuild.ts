import { tjsxRE, transform } from './esbuildService'

import type { Plugin } from 'rollup'

export const createEsbuildPlugin = async (
  minify: boolean,
  jsx: {
    factory?: string
    fragment?: string
  }
): Promise<Plugin> => {
  const jsxConfig = {
    jsxFactory: jsx.factory,
    jsxFragment: jsx.fragment
  }

  return {
    name: 'mvt:esbuild',
    async transform(code, file) {
      if (tjsxRE.test(file)) {
        return transform(code, file, { ...jsxConfig })
      }
    },
    async renderChunk(code, chunk) {
      if (minify) {
        return transform(code, chunk.fileName, {
          minify: true
        })
      } else {
        return null
      }
    }
  }
}
