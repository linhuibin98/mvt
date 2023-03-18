import path from 'path'

import chokidar from 'chokidar'
import slash from 'slash'

import { parseSFC } from './parseSFC.mjs'

export function createFileWatcher(notify) {
    const fileWatcher = chokidar.watch(process.cwd(), {
        ignored: [/node_modules/]
    })

    fileWatcher.on('change', async (file) => {
        file = slash(file)
        const resourcePath = slash(path.join('/', path.relative(process.cwd(), file)))
        if (file.endsWith('.vue')) {
            const [descriptor, prevDescriptor] = await parseSFC(file)

            if (!prevDescriptor) {
                // 文件还没有被访问过
                // the file has never been accessed yet
                return
            }

            if (
                (descriptor.script && descriptor.script.content) !==
                (prevDescriptor.script && prevDescriptor.script.content)
            ) {
                console.log(`[hmr:reload] <script> for ${resourcePath} changed. Triggering component reload.`)
                notify({
                    type: 'reload',
                    path: resourcePath
                })
                return
            }

            if (
                (descriptor.template && descriptor.template.content) !==
                (prevDescriptor.template && prevDescriptor.template.content)
            ) {
                console.log(`[hmr:rerender] <template> for ${resourcePath} changed. Triggering component re-render.`)
                notify({
                    type: 'rerender',
                    path: resourcePath
                })
                return
            }

            // TODO styles
        } else {
            console.log(`[hmr:full-reload] script file ${resourcePath} changed. Triggering full page reload.`)
            notify({
                type: 'full-reload'
            })
        }
    })
}
