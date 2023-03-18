import fs from 'fs'
import path from 'path'
import resolve from 'resolve-cwd'
import { sendJSStream } from '../utils/index.mjs'

export function moduleMiddleware(id, res) {
    let modulePath
    // TODO support custom imports map e.g. for snowpack web_modules

    // fallback to node resolve
    try {
        modulePath = resolve(id)
        // TODO
        if (id === 'vue') {
            modulePath = path.join(process.cwd(), 'node_modules/vue/dist/vue.esm-browser.js')
        }
    } catch (e) {
        res.statusCode = 404
        return res.end()
    }

    return sendJSStream(res, modulePath)
}
