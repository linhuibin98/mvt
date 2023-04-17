import path from 'pathe'
import { promises as fs, existsSync } from 'fs'
import { resolveVue } from './resolveVue'
import { hmrClientId } from './serverPluginHmr'
import chalk from 'chalk'
import { rollup as Rollup, Plugin } from 'rollup'
import { normalizePath } from '@rollup/pluginutils'
import resolve from 'resolve-from'

export interface BuildOptions {
  root?: string
  cdn?: boolean
}

export async function build({
  root = process.cwd(),
  cdn = resolveVue(root).hasLocalVue
}: BuildOptions = {}) {
  process.env.NODE_ENV = 'production'
  const start = Date.now()

  // lazy require rollup so that we don't load it when only using the dev server
  // importing it just for the types
  const rollup = require('rollup').rollup as typeof Rollup
  const outDir = path.resolve(root, 'dist')
  const indexPath = path.resolve(root, 'index.html')
  const scriptRE = /<script\b[^>]*>([\s\S]*?)<\/script>/gm
  const indexContent = await fs.readFile(indexPath, 'utf-8')

  const cssFilename = 'style.css'

  // make sure to use the same verison of vue from the CDN.
  const vueVersion = resolveVue(root).version
  const cdnLink = `https://unpkg.com/vue@${vueVersion}/dist/vue.esm-browser.prod.js`

  const mvtPlugin: Plugin = {
    name: 'mvt',
    resolveId(id) {
      if (id === hmrClientId) {
        return hmrClientId
      } else if (id.startsWith('/')) {
        return id.startsWith(root) ? id : path.resolve(root, id.slice(1))
      } else if (id === 'vue') {
        if (cdn) {
          return resolveVue(root, true).vue
        } else {
          return {
            id: cdnLink,
            external: true
          }
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

  const bundle = await rollup({
    input: indexPath,
    preserveEntrySignatures: false,
    plugins: [
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
      require('rollup-plugin-terser').terser()
    ]
  })

  if (existsSync(outDir)) {
    await fs.rm(outDir, { recursive: true })
  }
  await fs.mkdir(outDir, { recursive: true })

  const { output } = await bundle.generate({
    dir: outDir,
    format: 'es'
  })

  let generatedIndex = indexContent.replace(scriptRE, '').trim()

  // TODO handle public path for injections?
  // this would also affect paths in templates and css.

  // inject css link
  generatedIndex = injectCSS(generatedIndex, cssFilename)

  // write css
  let css = ''
  styles.forEach((s) => {
    css += s
  })
  const cssFilepath = path.join(outDir, cssFilename)
  console.log(
    `write ${chalk.magenta(path.relative(process.cwd(), cssFilepath))}`
  )
  await fs.writeFile(
    cssFilepath,
    // minify with cssnano
    (
      await require('postcss')([require('cssnano')]).process(css, {
        from: undefined
      })
    ).css
  )

  if (!cdn) {
    // if not inlining vue, inject cdn link so it can start the fetch early
    generatedIndex = injectScript(generatedIndex, cdnLink)
  }

  // inject chunks
  for (const chunk of output) {
    if (chunk.type === 'chunk') {
      if (chunk.isEntry) {
        // inject chunk to html
        generatedIndex = injectScript(generatedIndex, chunk.fileName)
      }
      // write chunk
      const filepath = path.join(outDir, chunk.fileName)
      console.log(`write ${chalk.cyan(path.relative(process.cwd(), filepath))}`)
      await fs.writeFile(filepath, chunk.code)
    }
  }

  // write html
  const indexOutPath = path.join(outDir, 'index.html')
  console.log(
    `write ${chalk.green(path.relative(process.cwd(), indexOutPath))}`
  )
  await fs.writeFile(indexOutPath, generatedIndex)

  console.log(`done in ${((Date.now() - start) / 1000).toFixed(2)}s.`)
}

function injectCSS(html: string, filename: string) {
  const tag = `<link rel="stylesheet" href="/${filename}">`
  if (/<\/head>/.test(html)) {
    return html.replace(/<\/head>/, `${tag}\n</head>`)
  } else {
    return tag + '\n' + html
  }
}

function injectScript(html: string, filename: string) {
  filename = /^https?:\/\//.test(filename) ? filename : `/${filename}`
  const tag = `<script type="module" src="${filename}"></script>`
  if (/<\/body>/.test(html)) {
    return html.replace(/<\/body>/, `${tag}\n</body>`)
  } else {
    return html + '\n' + tag
  }
}
