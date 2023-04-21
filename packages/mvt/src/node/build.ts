import path from 'pathe'
import { promises as fs } from 'fs'
import { resolveVue } from './resolveVue'
import chalk from 'chalk'
import slash from 'slash'
import resolve from 'resolve-from'
import { Resolver, createResolver } from './resolver'
import { createBuildResolvePlugin } from './buildPluginResolve'
import { createBuildHtmlPlugin, scriptRE } from './buildPluginHtml'
import { createBuildCssPlugin } from './buildPluginCss'
import { createBuildAssetPlugin } from './buildPluginAsset'

import type {
  rollup as Rollup,
  InputOptions,
  OutputOptions,
  RollupOutput
} from 'rollup'
import type { Options } from 'rollup-plugin-vue'

interface BuildOptions {
  root?: string
  cdn?: boolean
  resolvers?: Resolver[]
  outDir?: string
  assetsDir?: string
  // list files that are included in the build, but not inside project root.
  srcRoots?: string[]
  rollupInputOptions?: InputOptions
  rollupOutputOptions?: OutputOptions
  rollupPluginVueOptions?: Partial<Options>
  emitAssets?: boolean
  write?: boolean // if false, does not write to disk.
  minify?: boolean // if true, generates non-minified code for inspection.
  silent?: boolean
}

export interface BuildResult {
  html: string
  assets: RollupOutput['output']
}

export async function build(
  options: BuildOptions = {}
): Promise<BuildResult | BuildResult[]> {
  process.env.NODE_ENV = 'production'
  const start = Date.now()
  const {
    root = process.cwd(),
    cdn = !resolveVue(root).hasLocalVue,
    outDir = path.resolve(root, 'dist'),
    assetsDir = '',
    resolvers = [],
    srcRoots = [],
    rollupInputOptions = {},
    rollupOutputOptions = {},
    rollupPluginVueOptions = {},
    emitAssets = true,
    write = true,
    minify = true,
    silent = false
  } = options

  // lazy require rollup so that we don't load it when only using the dev server
  // importing it just for the types
  const rollup = require('rollup').rollup as typeof Rollup

  const indexPath = slash(path.resolve(root, 'index.html'))
  const cssFileName = 'style.css'
  const resolvedAssetsPath = path.join(outDir, assetsDir)

  let indexContent: string = ''
  try {
    indexContent = await fs.readFile(indexPath, 'utf-8')
  } catch (e) {
    // TODO no index
  }

  const resolver = createResolver(root, resolvers)
  srcRoots.push(root)

  const userPlugins = await Promise.resolve(rollupInputOptions.plugins)

  const bundle = await rollup({
    input: indexPath,
    ...rollupInputOptions,
    plugins: [
      // user plugins
      ...(Array.isArray(userPlugins)
        ? userPlugins
        : userPlugins
        ? [userPlugins]
        : []),
      // mvt:resolve
      createBuildResolvePlugin(root, cdn, srcRoots, resolver),
      // mvt:html
      ...(indexContent ? [createBuildHtmlPlugin(indexPath, indexContent)] : []),
      // vue
      require('rollup-plugin-vue')({
        transformAssetUrls: true,
        // TODO: for now we directly handle pre-processors in rollup-plugin-vue
        // so that we don't need to install dedicated rollup plugins.
        // In the future we probably want to still use rollup plugins so that
        // preprocessors are also supported by importing from js files.
        preprocessStyles: true,
        preprocessCustomRequire: (id: string) => require(resolve(root, id)),
        // TODO proxy cssModules config
        ...rollupPluginVueOptions
      }),
      require('@rollup/plugin-json')(),
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
      // mvt:css
      createBuildCssPlugin(root, assetsDir, cssFileName, minify),
      // mvt:asset
      createBuildAssetPlugin(assetsDir),
      // minify with terser
      // modules: true and toplevel: true are implied with format: 'es'
      ...(minify ? [require('rollup-plugin-terser').terser()] : [])
    ],
    onwarn(warning, warn) {
      if (warning.code !== 'CIRCULAR_DEPENDENCY') {
        warn(warning)
      }
    }
  })

  const { output } = await bundle.generate({
    format: 'es',
    ...rollupOutputOptions
  })

  let generatedIndex = indexContent && indexContent.replace(scriptRE, '').trim()
  // TODO handle public path for injections?
  // this would also affect paths in templates and css.
  if (generatedIndex) {
    // inject css link
    generatedIndex = injectCSS(generatedIndex, cssFileName)
    if (cdn) {
      // if not inlining vue, inject cdn link so it can start the fetch early
      generatedIndex = injectScript(generatedIndex, resolveVue(root).cdnLink)
    }
  }

  if (write) {
    await fs.rm(outDir, { recursive: true, force: true })
    await fs.mkdir(outDir, { recursive: true })
  }

  // inject / write bundle
  for (const chunk of output) {
    if (chunk.type === 'chunk') {
      if (chunk.isEntry && generatedIndex) {
        // inject chunk to html
        generatedIndex = injectScript(generatedIndex, chunk.fileName)
      }
      // write chunk
      if (write) {
        const filepath = path.join(resolvedAssetsPath, chunk.fileName)
        !silent &&
          console.log(
            `write ${chalk.cyan(path.relative(process.cwd(), filepath))}`
          )
        await fs.mkdir(path.dirname(filepath), { recursive: true })
        await fs.writeFile(filepath, chunk.code)
      }
    } else if (emitAssets) {
      // write asset
      const filepath = path.join(resolvedAssetsPath, chunk.fileName)
      !silent &&
        console.log(
          `write ${chalk.magenta(path.relative(process.cwd(), filepath))}`
        )
      await fs.mkdir(path.dirname(filepath), { recursive: true })
      await fs.writeFile(filepath, chunk.source)
    }
  }

  if (write) {
    // write html
    if (generatedIndex) {
      const indexOutPath = path.join(outDir, 'index.html')
      !silent &&
        console.log(
          `write ${chalk.green(path.relative(process.cwd(), indexOutPath))}`
        )
      await fs.writeFile(indexOutPath, generatedIndex)
    }
  }

  !silent &&
    console.log(
      `Build completed in ${((Date.now() - start) / 1000).toFixed(2)}s.`
    )

  return {
    assets: output,
    html: generatedIndex || ''
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
