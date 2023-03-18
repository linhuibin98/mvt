// This file runs in the browser.
import type { HMRRuntime } from 'vue'

declare var __VUE_HMR_RUNTIME__: HMRRuntime

const socket = new WebSocket(`ws://${location.host}`)

// Listen for messages
socket.addEventListener('message', ({ data }) => {
  const { type, path, index } = JSON.parse(data)
  switch (type) {
    case 'connected':
      console.log(`[mvt] connected.`)
      break
    case 'reload':
      import(`${path}?t=${Date.now()}`).then((m) => {
        __VUE_HMR_RUNTIME__.reload(path, m.default)
        console.log(`[mvt] ${path} reloaded.`)
      })
      break
    case 'rerender':
      import(`${path}?type=template&t=${Date.now()}`).then((m) => {
        __VUE_HMR_RUNTIME__.rerender(path, m.render)
        console.log(`[mvt] ${path} template updated.`)
      })
      break
    case 'update-style':
      import(`${path}?type=style&index=${index}&t=${Date.now()}`).then((m) => {
        // TODO style hmr
      })
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
