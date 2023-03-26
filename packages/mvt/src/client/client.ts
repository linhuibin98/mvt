// This file runs in the browser.
import type { HMRRuntime } from 'vue'

console.log('[mvt] connecting...')

declare var __VUE_HMR_RUNTIME__: HMRRuntime

const socket = new WebSocket(`ws://${location.host}`)

// Listen for messages
socket.addEventListener('message', ({ data }) => {
  const { type, path, index, id, timestamp } = JSON.parse(data)
  switch (type) {
    case 'connected':
      console.log(`[mvt] connected.`)
      break
    case 'vue-reload':
      import(`${path}?t=${timestamp}`).then((m) => {
        __VUE_HMR_RUNTIME__.reload(path, m.default)
        console.log(`[mvt] ${path} reloaded.`)
      })
      break
    case 'vue-rerender':
      import(`${path}?type=template&t=${timestamp}`).then((m) => {
        __VUE_HMR_RUNTIME__.rerender(path, m.render)
        console.log(`[mvt] ${path} template updated.`)
      })
      break
    case 'vue-style-update':
      updateStyle(id, `${path}?type=style&index=${index}&t=${timestamp}`)
      console.log(`[mvt] ${path} style${index > 0 ? `#${index}` : ``} updated.`)
      break
    case 'vue-style-remove':
      const link = document.getElementById(`vue-css-${id}`)
      if (link) {
        document.head.removeChild(link)
      }
      break
    case 'js-update':
      const update = jsUpdateMap.get(path)
      if (update) {
        update(timestamp)
        console.log(`[mvt]: js module reloaded: `, path)
      } else {
        console.error(
          `[mvt] got js update notification but no client callback was registered. Something is wrong.`
        )
      }
      break
    case 'full-reload':
      location.reload()
  }
})

// 尝试重连
// ping server
socket.addEventListener('close', () => {
  console.log(`[mvt] server connection lost. polling for restart...`)
  setInterval(() => {
    new WebSocket(`ws://${location.host}`).addEventListener('open', () => {
      location.reload()
    })
  }, 1000)
})

export function updateStyle(id: string, url: string) {
  const linkId = `mvt-css-${id}`
  let link = document.getElementById(linkId)
  if (!link) {
    link = document.createElement('link')
    link.id = linkId
    link.setAttribute('rel', 'stylesheet')
    link.setAttribute('type', 'text/css')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

const jsUpdateMap = new Map<string, (timestamp: number) => void>()

export const hot = {
  accept(
    importer: string,
    deps: string | string[],
    callback: (modules: object | object[]) => void
  ) {
    jsUpdateMap.set(importer, (timestamp: number) => {
      if (Array.isArray(deps)) {
        Promise.all(deps.map((dep) => import(dep + `?t=${timestamp}`))).then(
          callback
        )
      } else {
        import(deps + `?t=${timestamp}`).then(callback)
      }
    })
  }
}
