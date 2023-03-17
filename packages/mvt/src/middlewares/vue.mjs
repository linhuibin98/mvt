import path from 'path'
import url from 'url';

import { compileTemplate } from '@vue/compiler-sfc'
import { sendJS } from '../utils/index.mjs'
import { parseSFC } from '../utils/parseSFC.mjs'

export function vueMiddleware(req, res) {
    const parsed = url.parse(req.url, true)
    const query = parsed.query
    const filename = path.join(process.cwd(), parsed.pathname.slice(1))
    const [descriptor] = parseSFC(
        filename,
        true /* save last accessed descriptor on the client */
    )

    if (!query.type) {
        // inject hmr client
        let code = `import "/__hmrClient"\n`
        // TODO use more robust rewrite
        if (descriptor.script) {
            code += descriptor.script.content.replace(
                `export default`,
                'const script ='
            )
            code += `\nexport default script`
        } else {
            code += `const script = {};\nexport default script;`
        }
        if (descriptor.template) {
            code += `\nimport { render } from ${JSON.stringify(
                parsed.pathname + `?type=template${query.t ? `&t=${query.t}` : ``}`
            )}`
            code += `\nscript.render = render`
        }
        if (descriptor.style) {
            // TODO
        }
        code += `\nscript.__hmrId = ${JSON.stringify(parsed.pathname)}`
        return sendJS(res, code)
    }

    if (query.type === 'template') {
        const { code, errors } = compileTemplate({
            source: descriptor.template.content,
            filename,
            compilerOptions: {
                // TODO infer proper Vue path
                runtimeModuleName: '/node_modules/vue/dist/vue.esm-browser.js'
            }
        })

        if (errors) {
            // TODO
        }
        return sendJS(res, code)
    }

    if (query.type === 'style') {
        // TODO
        return
    }

    // TODO custom blocks
}

export default vueMiddleware;
