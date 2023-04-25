import { transform as esbuildTransform, TransformOptions } from 'esbuild'

export const tjsxRE = /\.(tsx?|jsx)$/
const sourceMapRE = /\/\/# sourceMappingURL.*/

export const transform = async (
  code: string,
  file: string,
  options: TransformOptions = {}
) => {
  try {
    options.sourcemap = true
    const result = await esbuildTransform(code, options)
    if (result.warnings.length) {
      console.error(`[mvt] warnings while transforming ${file} with esbuild:`)
      // TODO pretty print this
      result.warnings.forEach((w) => console.error(w))
    }

    return {
      code: result.code.replace(sourceMapRE, ''),
      map: result.map
    }
  } catch (e) {
    console.error(`[mvt] error while transforming ${file} with esbuild:`)
    console.error(e)
    return {
      code: '',
      map: undefined
    }
  }
}
