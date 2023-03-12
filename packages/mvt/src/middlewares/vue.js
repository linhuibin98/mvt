import path from 'path'
import url from 'url';

import { compileTemplate } from '@vue/compiler-sfc'
import { sendJS } from '../utils/index.js'
import { parseSFC } from '../utils/parseSFC.js'

export function vueMiddleware(req, res) {
    const parsed = url.parse(req.url, true)
    const query = parsed.query
    const filename = path.join(process.cwd(), parsed.pathname.slice(1))
    const [descriptor] = parseSFC(filename)

    if (!query.type) {
        let code = ``
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
