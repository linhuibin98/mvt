import { transform as esbuildTransform, TransformOptions } from 'esbuild'
import path from 'pathe'

export const tjsxRE = /\.(tsx?|jsx)$/
const sourceMapRE = /\/\/# sourceMappingURL.*/

export const transform = async (
  code: string,
  file: string,
  options: TransformOptions = {}
) => {
  options = {
    ...options,
    loader: options.loader || (path.extname(file).slice(1) as any),
    sourcemap: true
  }
  try {
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
    console.error(`options: `, options)
    console.error(e)
    return {
      code: '',
      map: undefined
    }
  }
}
