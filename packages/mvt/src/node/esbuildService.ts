import { transform as esbuildTransform, TransformOptions, Message } from 'esbuild'
import path from 'pathe'
import chalk from 'chalk'
import { generateCodeFrame } from '@vue/compiler-sfc'

const debug = require('debug')('mvt:esbuild')

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
      result.warnings.forEach((m) => printMessage(m, code))
    }

    return {
      code: result.code.replace(sourceMapRE, ''),
      map: result.map
    }
  } catch (e) {
    console.error(
      chalk.red(`[mvt] error while transforming ${file} with esbuild:`)
    )
    e.errors.forEach((m: Message) => printMessage(m, code))
    debug(`options used: `, options)
    return {
      code: '',
      map: undefined
    }
  }
}

function printMessage(m: Message, code: string) {
  console.error(chalk.yellow(m.text))
  if (m.location) {
    const lines = code.split(/\r?\n/g)
    const line = Number(m.location.line)
    const column = Number(m.location.column)
    const offset =
      lines
        .slice(0, line - 1)
        .map((l) => l.length)
        .reduce((total, l) => total + l + 1, 0) + column
    console.error(generateCodeFrame(code, offset, offset + 1))
  }
}
