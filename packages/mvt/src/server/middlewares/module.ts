import path from 'pathe'
import resolve from 'resolve-cwd'
import { sendJSStream } from '../utils/index'

import type { ServerResponse } from 'http'

export function moduleMiddleware(id: string, res: ServerResponse) {
  let modulePath
  // TODO support custom imports map e.g. for snowpack web_modules

  // fallback to node resolve
  try {
    modulePath = resolve(id)
    // TODO
    if (id === 'vue') {
      modulePath = path.join(
        process.cwd(),
        'node_modules/vue/dist/vue.esm-browser.js'
      )
    }
  } catch (e) {
    res.statusCode = 404
    return res.end()
  }

  return sendJSStream(res, modulePath)
}
