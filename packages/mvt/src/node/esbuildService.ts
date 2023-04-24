import { transform as esbuildTransform, TransformOptions } from 'esbuild'
import { Plugin } from 'rollup'

export const transform = async (
  code: string,
  options: TransformOptions,
  operation: string
) => {
  try {
    const result = await esbuildTransform(code, options)
    if (result.warnings.length) {
      console.error(`[mvt] warnings while ${operation} with esbuild:`)
      // TODO pretty print this
      result.warnings.forEach((w) => console.error(w))
    }

    return {
      code: result.code,
      map: result.map
    }
  } catch (e) {
    console.error(`[mvt] error while ${operation} with esbuild:`)
    console.error(e)
    return {
      code: '',
      map: ''
    }
  }
}

export const createMinifyPlugin = async (): Promise<Plugin> => {
  return {
    name: 'mvt:minify',
    async renderChunk(code, chunk) {
      return transform(code, { minify: true }, `minifying ${chunk.fileName}`)
    }
  }
}
