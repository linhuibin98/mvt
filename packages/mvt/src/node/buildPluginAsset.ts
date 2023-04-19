import path from 'pathe'
import { promises as fs } from 'fs'
import { isStaticAsset } from './utils'
import hash from 'hash-sum'
import slash from 'slash'

import type { Plugin } from 'rollup'

const debug = require('debug')('mvt:build:asset')

export const createBuildAssetPlugin = (assetsDir: string): Plugin => {
    const assets = new Map()

    return {
        name: 'mvt:asset',
        load(id) {
            if (isStaticAsset(id)) {
                const ext = path.extname(id)
                const baseName = path.basename(id, ext)
                const resolvedName = `${baseName}.${hash(id)}${ext}`
                assets.set(id, resolvedName)
                const publicPath = slash(path.join('/', assetsDir, resolvedName))
                debug(`${id} -> ${publicPath}`)
                return `export default ${JSON.stringify(publicPath)}`
            }
        },

        async generateBundle(_options, bundle) {
            for (const [from, fileName] of assets) {
                bundle[fileName] = {
                    type: 'asset',
                    fileName,
                    name: fileName,
                    source: await fs.readFile(from),
                    needsCodeReference: true
                }
            }
        }
    }
}

