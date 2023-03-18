import path from 'pathe'
import hash from 'hash-sum'
import chokidar from 'chokidar'

import { parseSFC } from './vueCompiler'

import type { SFCBlock } from '@vue/compiler-sfc'

export interface ServerNotification {
  type: string
  path?: string
  index?: number
  id?: string
}

export function createFileWatcher(
  cwd: string,
  notify: (payload: ServerNotification) => void
) {
  const fileWatcher = chokidar.watch(cwd, {
    ignored: [/node_modules/]
  })

  fileWatcher.on('change', async (file) => {
    file = path.normalize(file)
    const resourcePath = path.join('/', path.relative(cwd, file))

    const send = (payload: ServerNotification) => {
      console.log(`[hmr] ${JSON.stringify(payload)}`)
      notify(payload)
    }

    if (file.endsWith('.vue')) {
      const [descriptor, prevDescriptor] = await parseSFC(file)

      if (!descriptor || !prevDescriptor) {
        // 文件还没有被访问过
        // the file has never been accessed yet
        return
      }

      if (!isEqual(descriptor.script, prevDescriptor.script)) {
        send({
          type: 'reload',
          path: resourcePath
        })
        return
      }

      if (!isEqual(descriptor.template, prevDescriptor.template)) {
        send({
          type: 'rerender',
          path: resourcePath
        })
        return
      }

      const prevStyles = prevDescriptor.styles || []
      const nextStyles = descriptor.styles || []
      
      if (
        prevStyles.some((s) => s.scoped) !== nextStyles.some((s) => s.scoped)
      ) {
        send({
          type: 'reload',
          path: resourcePath
        })
      }

      nextStyles.forEach((_, i) => {
        if (!prevStyles[i] || !isEqual(prevStyles[i], nextStyles[i])) {
          send({
            type: 'style-update',
            path: resourcePath,
            index: i
          })
        }
      })

      prevStyles.slice(nextStyles.length).forEach((_, i) => {
        send({
          type: 'style-remove',
          path: resourcePath,
          id: `${hash(resourcePath)}-${i + nextStyles.length}`
        })
      })

    } else {
      send({
        type: 'full-reload'
      })
    }
  })
}

function isEqual(a: SFCBlock | null, b: SFCBlock | null) {
  if (!a || !b) return false
  if (a.content !== b.content) return false
  const keysA = Object.keys(a.attrs)
  const keysB = Object.keys(b.attrs)
  if (keysA.length !== keysB.length) {
    return false
  }
  return keysA.every((key) => a.attrs[key] === b.attrs[key])
}
