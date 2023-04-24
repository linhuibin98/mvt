import path from 'pathe'
import fs from 'fs-extra'
import { resolveVue } from './vueResolver'
import chalk from 'chalk'
import slash from 'slash'
import resolve from 'resolve-from'
import { Resolver, createResolver } from './resolver'
import { createBuildResolvePlugin } from './buildPluginResolve'
import { createBuildHtmlPlugin } from './buildPluginHtml'
import { createBuildCssPlugin } from './buildPluginCss'
import { createBuildAssetPlugin } from './buildPluginAsset'
import { createMinifyPlugin } from './esbuildService'

import type {
  rollup as Rollup,
  InputOptions,
  OutputOptions,
  RollupOutput,
  ExternalOption
} from 'rollup'
import type { Options } from 'rollup-plugin-vue'

interface BuildOptions {
  /**
   * Project root path on file system.
   * Defaults to `process.cwd()`
   */
  root?: string
  /**
   * Base public path when served in production.
   * Defaults to /
   */
  base?: string
  /**
   * If true, will be importing Vue from a CDN.
   * Dsiabled automatically when a local vue installation is present.
   */
  cdn?: boolean
  /**
   * Resolvers to map dev server public path requests to/from file system paths,
   * and optionally map module ids to public path requests.
   */
  resolvers?: Resolver[]
  /**
   * Defaults to `dist`
   */
  outDir?: string
  /**
   * Nest js / css / static assets under a directory under `outDir`.
   * Defaults to `assets`
   */
  assetsDir?: string
  /**
   * Static asset files smaller than this number (in bytes) will be inlined as
   * base64 strings.
   * Default: 4096 (4kb)
   */
  assetsInlineLimit?: number
  /**
   * List files that are included in the build, but not inside project root.
   * e.g. if you are building a higher level tool on top of mvt and includes
   * some code that will be bundled into the final build.
   */
  srcRoots?: string[]
  /**
   * Will be passed to rollup.rollup()
   * https://rollupjs.org/guide/en/#big-list-of-options
   */
  rollupInputOptions?: InputOptions
  /**
   * Will be passed to bundle.generate()
   * https://rollupjs.org/guide/en/#big-list-of-options
   */
  rollupOutputOptions?: OutputOptions
  /**
   * Will be passed to rollup-plugin-vue
   * https://github.com/vuejs/rollup-plugin-vue/blob/next/src/index.ts
   */
  rollupPluginVueOptions?: Partial<Options>
  /**
   * Whether to emit index.html
   */
  emitIndex?: boolean
  /**
   * Whether to emit assets other than JavaScript
   */
  emitAssets?: boolean
  /**
   * Whether to write bundle to disk
   */
  write?: boolean
  /**
   * Whether to minify output
   */
  minify?: boolean | 'terser' | 'esbuild'
  /**
   * Whether to log asset info to console
   */
  silent?: boolean
}

export interface BuildResult {
  html: string
  assets: RollupOutput['output']
}

const enum WriteType {
  JS,
  CSS,
  ASSET,
  HTML
}

const writeColors = {
  [WriteType.JS]: chalk.cyan,
  [WriteType.CSS]: chalk.magenta,
  [WriteType.ASSET]: chalk.green,
  [WriteType.HTML]: chalk.blue
}

/**
 * Bundles the app for production.
 * Returns a Promise containing the build result.
 */
export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  process.env.NODE_ENV = 'production'
  const start = Date.now()
  const {
    root = process.cwd(),
    base = '/',
    cdn = !resolveVue(root).hasLocalVue,
    outDir = path.resolve(root, 'dist'),
    assetsDir = 'assets',
    assetsInlineLimit = 4096,
    resolvers = [],
    srcRoots = [],
    rollupInputOptions = {},
    rollupOutputOptions = {},
    rollupPluginVueOptions = {},
    emitIndex = true,
    emitAssets = true,
    write = true,
    minify = true,
    silent = false
  } = options

  const indexPath = emitIndex ? path.resolve(root, 'index.html') : null
  const publicBasePath = base.replace(/([^/])$/, '$1/') // ensure ending slash
  const resolvedAssetsPath = path.join(outDir, assetsDir)
  const cssFileName = 'style.css'

  const resolver = createResolver(root, resolvers)

  const { htmlPlugin, renderIndex } = await createBuildHtmlPlugin(
    indexPath,
    publicBasePath,
    assetsDir,
    assetsInlineLimit,
    resolver
  )

  const minifyPlugin = minify
    ? minify === 'esbuild'
      ? await createMinifyPlugin()
      : require('rollup-plugin-terser').terser()
    : null

  // lazy require rollup so that we don't load it when only using the dev server
  // importing it just for the types
  const rollup = require('rollup').rollup as typeof Rollup

  const userPlugins = await Promise.resolve(rollupInputOptions.plugins)

  const bundle = await rollup({
    input: slash(path.resolve(root, 'index.html')),
    preserveEntrySignatures: false,
    ...rollupInputOptions,
    plugins: [
      // user plugins
      ...(Array.isArray(userPlugins)
        ? userPlugins
        : userPlugins
        ? [userPlugins]
        : []),
      // mvt:resolve
      createBuildResolvePlugin(root, cdn, [root, ...srcRoots], resolver),
      // mvt:html
      ...(htmlPlugin ? [htmlPlugin] : []),
      // vue
      require('rollup-plugin-vue')({
        transformAssetUrls: {
          includeAbsolute: true
        },
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
      createBuildCssPlugin(
        root,
        publicBasePath,
        assetsDir,
        cssFileName,
        !!minify,
        assetsInlineLimit
      ),
      // mvt:asset
      createBuildAssetPlugin(publicBasePath, assetsDir, assetsInlineLimit),
      // minify
      ...(minifyPlugin ? [minifyPlugin] : [])
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

  const indexHtml = renderIndex(root, cdn, cssFileName, output)

  if (write) {
    const cwd = process.cwd()
    const writeFile = async (
      filepath: string,
      content: string | Uint8Array,
      type: WriteType
    ) => {
      await fs.ensureDir(path.dirname(filepath))
      await fs.writeFile(filepath, content)
      if (!silent) {
        console.log(
          `${chalk.gray(`[write]`)} ${writeColors[type](
            path.relative(cwd, filepath)
          )} ${(content.length / 1024).toFixed(2)}kb`
        )
      }
    }

    await fs.remove(outDir)
    await fs.ensureDir(outDir)

    for (const chunk of output) {
      if (chunk.type === 'chunk') {
        // write chunk
        const filepath = path.join(resolvedAssetsPath, chunk.fileName)
        await writeFile(filepath, chunk.code, WriteType.JS)
      } else if (emitAssets) {
        // write asset
        const filepath = path.join(resolvedAssetsPath, chunk.fileName)
        await writeFile(
          filepath,
          chunk.source,
          chunk.fileName.endsWith('.css') ? WriteType.CSS : WriteType.ASSET
        )
      }
    }

    // write html
    if (indexHtml && emitIndex) {
      await writeFile(
        path.join(outDir, 'index.html'),
        indexHtml,
        WriteType.HTML
      )
    }
  }

  !silent &&
    console.log(
      `Build completed in ${((Date.now() - start) / 1000).toFixed(2)}s.`
    )

  return {
    assets: output,
    html: indexHtml
  }
}

/**
 * Bundles the app in SSR mode.
 * - All Vue dependencies are automatically externalized
 * - Imports to dependencies are compiled into require() calls
 * - Templates are compiled with SSR specific optimizations.
 */
export function ssrBuild(options: BuildOptions = {}): Promise<BuildResult> {
  const { rollupInputOptions, rollupOutputOptions, rollupPluginVueOptions } =
    options

  return build({
    ...options,
    rollupPluginVueOptions: {
      ...rollupPluginVueOptions,
      target: 'node'
    },
    rollupInputOptions: {
      ...rollupInputOptions,
      external: resolveExternal(
        rollupInputOptions && rollupInputOptions.external
      )
    },
    rollupOutputOptions: {
      ...rollupOutputOptions,
      format: 'cjs',
      exports: 'named'
    },
    emitIndex: false,
    emitAssets: false,
    minify: false
  })
}

function resolveExternal(
  userExternal: ExternalOption | undefined
): ExternalOption {
  const required = ['vue', /^@vue\//]
  if (!userExternal) {
    return required
  }
  if (Array.isArray(userExternal)) {
    return [...required, ...userExternal]
  } else if (typeof userExternal === 'function') {
    return (src, importer, isResolved) => {
      if (src === 'vue' || /^@vue\//.test(src)) {
        return true
      }
      return userExternal(src, importer, isResolved)
    }
  } else {
    return [...required, userExternal]
  }
}
