import path from 'pathe'
import { promises as fs } from 'fs'
import {
  SFCDescriptor,
  SFCTemplateBlock,
  SFCStyleBlock
} from '@vue/compiler-sfc'
import { resolveCompiler } from '../resolveVue'
import hash from 'hash-sum'

import type { Middleware } from '../index'

// Resolve the correct `vue` and `@vue.compiler-sfc` to use.
// If the user project has local installations of these, they should be used;
// otherwise, fallback to the dependency of mvt itself.
export const vueMiddleware: Middleware = ({ root, app }) => {
  app.use(async (ctx, next) => {
    if (!ctx.path.endsWith('.vue')) {
      return next()
    }

    const pathname = ctx.path
    const query = ctx.query
    const filename = path.join(root, pathname.slice(1))
    const [descriptor] = await parseSFC(
      root,
      filename,
      true /* save last accessed descriptor on the client */
    )

    if (!descriptor) {
      ctx.status = 404
      return
    }

    ctx.type = 'js'

    if (!query.type) {
      ctx.body = compileSFCMain(descriptor, pathname, query.t as string)
      return
    }

    if (query.type === 'template') {
      ctx.body = compileSFCTemplate(
        root,
        descriptor.template!,
        filename,
        pathname,
        descriptor.styles.some((s) => s.scoped)
      )
      return
    }

    if (query.type === 'style') {
      ctx.body = compileSFCStyle(
        root,
        descriptor.styles[Number(query.index)],
        query.index as string,
        filename,
        pathname
      )
      return
    }

    // TODO custom blocks

  })
}

const pageCache = new Map()

export async function parseSFC(
  root: string,
  filename: string,
  saveCache = false
): Promise<[SFCDescriptor, SFCDescriptor | undefined] | []> {
  let content: string
  try {
    content = await fs.readFile(filename, 'utf-8')
  } catch (e) {
    return []
  }
  const { descriptor, errors } = resolveCompiler(root).parse(content, {
    filename
  })

  if (errors) {
    // TODO
  }

  const prev = pageCache.get(filename)
  if (saveCache) {
    pageCache.set(filename, descriptor)
  }
  return [descriptor, prev]
}

function compileSFCMain(
  descriptor: SFCDescriptor,
  pathname: string,
  timestamp: string | undefined
): string {
  timestamp = timestamp ? `&t=${timestamp}` : ``
  // inject hmr client
  let code = `import "/__hmrClient"\n`
  if (descriptor.script) {
    code += descriptor.script.content.replace(
      `export default`,
      'const __script ='
    )
  } else {
    code += `const __script = {}`
  }

  let hasScoped = false
  if (descriptor.styles) {
    descriptor.styles.forEach((s, i) => {
      if (s.scoped) hasScoped = true
      code += `\nimport ${JSON.stringify(
        pathname + `?type=style&index=${i}${timestamp}`
      )}`
    })
    if (hasScoped) {
      code += `\n__script.__scopeId = "data-v-${hash(pathname)}"`
    }
  }

  if (descriptor.template) {
    code += `\nimport { render as __render } from ${JSON.stringify(
      pathname + `?type=template${timestamp}`
    )}`
    code += `\n__script.render = __render`
  }

  code += `\n__script.__hmrId = ${JSON.stringify(pathname)}`
  code += `\nexport default __script`
  return code
}

function compileSFCTemplate(
  root: string,
  template: SFCTemplateBlock,
  filename: string,
  pathname: string,
  scoped: boolean
): string {
  const { code, errors } = resolveCompiler(root).compileTemplate({
    id: `data-v-${hash(pathname)}`,
    source: template.content,
    filename,
    compilerOptions: {
      runtimeModuleName: '/__modules/vue',
      scopeId: scoped ? `data-v-${hash(pathname)}` : null
    }
  })

  if (errors) {
    // TODO
  }
  return code
}

function compileSFCStyle(
  root: string,
  style: SFCStyleBlock,
  index: string,
  filename: string,
  pathname: string
): string {
  const id = hash(pathname)
  const { code, errors } = resolveCompiler(root).compileStyle({
    source: style.content,
    filename,
    id: `data-v-${id}`,
    scoped: style.scoped != null
  })

  // TODO css modules

  if (errors) {
    // TODO
  }

  return `
    const id = "vue-style-${id}-${index}"
    let style = document.getElementById(id)
    if (!style) {
      style = document.createElement('style')
      style.id = id
      document.head.appendChild(style)
    }
    style.textContent = ${JSON.stringify(code)}
  `.trim()
}

export default vueMiddleware
