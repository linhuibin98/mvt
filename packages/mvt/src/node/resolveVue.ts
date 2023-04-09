import path from 'pathe'
import resolve from 'resolve-from'
import sfcCompiler from '@vue/compiler-sfc'
import chalk from 'chalk'

interface ResolvedVuePaths {
  vue: string
  version: string
  hasLocalVue: boolean
  compiler: string
}

let resolved: ResolvedVuePaths | undefined = undefined

const toBuildPaths = (p: ResolvedVuePaths) => ({
  ...p,
  vue: p.vue.replace('esm-browser', 'esm-bundler')
})

// Resolve the correct `vue` and `@vue.compiler-sfc` to use.
// If the user project has local installations of these, they should be used;
// otherwise, fallback to the dependency of mvt itself.
export function resolveVue(root: string, isBuild = false): ResolvedVuePaths {
  if (resolved) {
    return isBuild ? toBuildPaths(resolved) : resolved
  }

  let vuePath: string
  let compilerPath: string
  let hasLocalVue = true
  let vueVersion: string
  try {
    // see if user has local vue installation
    const userVuePkg = resolve(root, 'vue/package.json')
    vueVersion = require(userVuePkg).version
    vuePath = path.join(
      path.dirname(userVuePkg),
      'dist/vue.runtime.esm-browser.js'
    )
    // also resolve matching sfc compiler
    try {
      const compilerPkgPath = resolve(root, '@vue/compiler-sfc/package.json')
      const compilerPkg = require(compilerPkgPath)
      if (compilerPkg.version !== require(userVuePkg).version) {
        throw new Error()
      }
      compilerPath = path.join(path.dirname(compilerPkgPath), compilerPkg.main)
    } catch (e) {
      hasLocalVue = false
      // user has local vue but has no compiler-sfc
      console.error(
        chalk.red(
          `[mvt] Error: a local installation of \`vue\` is detected but ` +
            `no matching \`@vue/compiler-sfc\` is found. Make sure to install ` +
            `both and use the same version.`
        )
      )
      compilerPath = require.resolve('@vue/compiler-sfc')
    }
  } catch (e) {
    // user has no local vue, use mvt's dependency version
    vuePath = require.resolve('vue/dist/vue.runtime.esm-browser.js')
    vueVersion = require('vue/package.json').version
    compilerPath = require.resolve('@vue/compiler-sfc')
  }

  resolved = {
    vue: vuePath,
    version: vueVersion,
    hasLocalVue,
    compiler: compilerPath
  }

  return isBuild ? toBuildPaths(resolved) : resolved
}

export function resolveCompiler(root: string): typeof sfcCompiler {
  return require(resolveVue(root).compiler)
}
