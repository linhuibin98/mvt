import path from 'pathe'
import { promises as fs, existsSync } from 'fs'
import { resolveVue } from './resolveVue'
import { hmrClientId } from './serverPluginHmr'
import chalk from 'chalk'
import {
  rollup as Rollup,
  Plugin,
  InputOptions,
  OutputOptions,
  RollupOutput
} from 'rollup'
import { normalizePath } from '@rollup/pluginutils'
import resolve from 'resolve-from'
import { Resolver, createResolver } from './resolver'

export interface BuildOptions {
  root?: string
  cdn?: boolean
  resolvers?: Resolver[]
  // list files that are included in the build, but not inside project root.
  srcRoots?: string[]
  rollupInputOptions?: InputOptions
  rollupOutputOptions?: OutputOptions
  write?: boolean // if false, does not write to disk.
  debug?: boolean // if true, generates non-minified code for inspection.
  cssFileName?: string
}

export interface BuildResult {
  js: RollupOutput['output']
  css: string
  html: string
}

const debugBuild = require('debug')('mvt:build')

export async function build({
  root = process.cwd(),
  cdn = resolveVue(root).hasLocalVue,
  resolvers = [],
  srcRoots = [],
  rollupInputOptions = {},
  rollupOutputOptions = {},
  write = true,
  debug = false,
  cssFileName = 'style.css'
}: BuildOptions = {}) {
  process.env.NODE_ENV = 'production'
  const start = Date.now()

  // lazy require rollup so that we don't load it when only using the dev server
  // importing it just for the types
  const rollup = require('rollup').rollup as typeof Rollup
  const outDir = rollupOutputOptions.dir || path.resolve(root, 'dist')

  const indexPath = path.resolve(root, 'index.html')
  const scriptRE = /<script\b[^>]*>([\s\S]*?)<\/script>/gm

  let indexContent: string | null = null
  try {
    indexContent = await fs.readFile(indexPath, 'utf-8')
  } catch (e) {
    // no index
  }

  // make sure to use the same verison of vue from the CDN.
  const vueVersion = resolveVue(root).version
  const cdnLink = `https://unpkg.com/vue@${vueVersion}/dist/vue.esm-browser.prod.js`

  const resolver = createResolver(root, resolvers)
  srcRoots.push(root)

  const mvtPlugin: Plugin = {
    name: 'mvt',
    resolveId(id) {
      if (id === hmrClientId) {
        return hmrClientId
      } else if (id.startsWith('/')) {
        // if id starts with any of the src root directories, it's a file request
        if (srcRoots.some((root) => id.startsWith(root))) {
          debugBuild(`[resolve] pass `, id)
          return
        } else {
          debugBuild(`[resolve]`, id, `-->`, resolver.requestToFile(id))
          return resolver.requestToFile(id)
        }
      } else if (id === 'vue') {
        if (cdn) {
          return resolveVue(root, true).vue
        } else {
          return {
            id: cdnLink,
            external: true
          }
        }
      } else {
        const request = resolver.idToRequest(id)
        if (request) {
          debugBuild(
            `[resolve]`,
            id,
            `-->`,
            request,
            `--> `,
            resolver.requestToFile(request)
          )
          return resolver.requestToFile(request)
        }
      }
    },
    load(id) {
      id = normalizePath(id)
      if (id === hmrClientId) {
        return `export const hot = {}`
      } else if (id === indexPath) {
        let script = ''
        let match

        while ((match = scriptRE.exec(indexContent))) {
          // TODO handle <script type="module" src="..."/>
          // just add it as an import
          script += match[1]
        }
        return script
      }
    }
  }

  const styles: Map<string, string> = new Map()

  const cssExtractPlugin: Plugin = {
    name: 'mvt-css',
    transform(code: string, id: string) {
      if (id.endsWith('.css')) {
        styles.set(id, code)
        return '/* css extracted by mvt */'
      }
    }
  }

  const userPlugins = await Promise.resolve(rollupInputOptions.plugins)

  const bundle = await rollup({
    input: indexPath,
    ...rollupInputOptions,
    plugins: [
      ...(Array.isArray(userPlugins) ? userPlugins : userPlugins ? [userPlugins] : []),
      mvtPlugin,
      require('rollup-plugin-vue')({
        // TODO: for now we directly handle pre-processors in rollup-plugin-vue
        // so that we don't need to install dedicated rollup plugins.
        // In the future we probably want to still use rollup plugins so that
        // preprocessors are also supported by importing from js files.
        preprocessStyles: true,
        preprocessCustomRequire: (id: string) => require(resolve(root, id))
      }),
      require('@rollup/plugin-node-resolve')({
        rootDir: root
      }),
      require('@rollup/plugin-replace')({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': '"production"',
          __DEV__: 'false'
        }
      }),
      cssExtractPlugin,
      ...(debug ? [] : [require('rollup-plugin-terser').terser()])
    ],
    onwarn(warning, warn) {
      if (warning.code !== 'CIRCULAR_DEPENDENCY') {
        warn(warning)
      }
    }
  })

  const { output } = await bundle.generate({
    dir: outDir,
    format: 'es',
    ...rollupOutputOptions
  })

  // finalize extracted css
  let css = ''
  styles.forEach((s) => {
    css += s
  })
  // minify with cssnano
  if (!debug) {
    css = (
      await require('postcss')([require('cssnano')]).process(css, {
        from: undefined
      })
    ).css
  }

  let generatedIndex = indexContent.replace(scriptRE, '').trim()
  // TODO handle public path for injections?
  // this would also affect paths in templates and css.
  if (cdn) {
    // if not inlining vue, inject cdn link so it can start the fetch early
    generatedIndex = injectScript(generatedIndex, cdnLink)
  }

  if (write) {
    if (existsSync(outDir)) {
      await fs.rm(outDir, { recursive: true })
    }
    await fs.mkdir(outDir, { recursive: true })
  }

  // inject / write javascript chunks
  for (const chunk of output) {
    if (chunk.type === 'chunk') {
      if (chunk.isEntry) {
        // inject chunk to html
        generatedIndex = injectScript(generatedIndex, chunk.fileName)
      }
      // write chunk
      const filepath = path.join(outDir, chunk.fileName)
      console.log(`write ${chalk.cyan(path.relative(process.cwd(), filepath))}`)
      await fs.mkdir(path.dirname(filepath), { recursive: true })
      await fs.writeFile(filepath, chunk.code)
    }
  }

  // inject css link
  generatedIndex = injectCSS(generatedIndex, cssFileName)
  if (write) {
    // write css
    const cssFilepath = path.join(outDir, cssFileName)
    console.log(
      `write ${chalk.magenta(path.relative(process.cwd(), cssFilepath))}`
    )
    await fs.writeFile(cssFilepath, css)

    // write html
    const indexOutPath = path.join(outDir, 'index.html')
    console.log(
      `write ${chalk.green(path.relative(process.cwd(), indexOutPath))}`
    )
    await fs.writeFile(indexOutPath, generatedIndex)
  }
  console.log(`done in ${((Date.now() - start) / 1000).toFixed(2)}s.`)

  return {
    js: output,
    html: generatedIndex,
    css
  }
}

function injectCSS(html: string, filename: string) {
  const tag = `<link rel="stylesheet" href="./${filename}">`
  if (/<\/head>/.test(html)) {
    return html.replace(/<\/head>/, `${tag}\n</head>`)
  } else {
    return tag + '\n' + html
  }
}

function injectScript(html: string, filename: string) {
  filename = /^https?:\/\//.test(filename) ? filename : `./${filename}`
  const tag = `<script type="module" src="${filename}"></script>`
  if (/<\/body>/.test(html)) {
    return html.replace(/<\/body>/, `${tag}\n</body>`)
  } else {
    return html + '\n' + tag
  }
}
