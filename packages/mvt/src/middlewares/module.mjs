import fs from 'fs'
import path from 'path'
import { sendJS }  from '../utils/index.mjs'

export function moduleMiddleware(id, res) {
    let modulePath
    // try node resolve first
    let nodeResolveError = false
    try {
        modulePath = require.resolve(id, {
            paths: [process.cwd()]
        })
    } catch (e) {
        nodeResolveError = true
    }

    // TODO resolve snowpack web_modules

    if (id === 'vue') {
        modulePath = path.join(process.cwd(), 'node_modules/vue/dist/vue.esm-browser.js')
        return sendJS(res, fs.readFileSync(modulePath, 'utf-8'))
    }
    if (nodeResolveError) {
        res.statusCode = 404
        return res.end()
    }
    return sendJS(res, fs.readFileSync(modulePath, 'utf-8'))
}
