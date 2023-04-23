import path from 'pathe'
import fs from 'fs-extra'
import { isStaticAsset } from './utils'
import hash from 'hash-sum'
import slash from 'slash'
import mime from 'mime-types'

import type { Plugin, OutputBundle } from 'rollup'

const debug = require('debug')('mvt:build:asset')

export interface AssetsOptions {
  inlineThreshold?: number
}

const defaultAssetsOptions: AssetsOptions = {
  inlineThreshold: 4096
}

export const getAssetPublicPath = async (
  id: string,
  assetsDir: string,
  assetsOptions: AssetsOptions
) => {
  const ext = path.extname(id)
  const baseName = path.basename(id, ext)
  const resolvedFileName = `${baseName}.${hash(slash(id))}${ext}`

  let url = slash(path.join('/', assetsDir, resolvedFileName))
  const content = await fs.readFile(id)
  if (!id.endsWith(`.svg`)) {
    if (content.length < assetsOptions.inlineThreshold!) {
      url = `data:${mime.lookup(id)};base64,${content.toString('base64')}`
    }
  }

  return {
    content,
    fileName: resolvedFileName,
    url
  }
}

export const registerAssets = (
  assets: Map<string, string>,
  bundle: OutputBundle
) => {
  for (const [fileName, source] of assets) {
    bundle[fileName] = {
      type: 'asset',
      fileName,
      name: fileName,
      source,
      needsCodeReference: true
    }
  }
}

export const createBuildAssetPlugin = (
  assetsDir: string,
  assetsOptions: AssetsOptions
): Plugin => {
  const assets = new Map()
  assetsOptions = { ...defaultAssetsOptions, ...assetsOptions }
  return {
    name: 'mvt:asset',
    async load(id) {
      if (isStaticAsset(id)) {
        const { fileName, content, url } = await getAssetPublicPath(
          id,
          assetsDir,
          assetsOptions
        )
        assets.set(fileName, content)
        debug(`${id} -> ${url}`)
        return `export default ${JSON.stringify(url)}`
      }
    },

    generateBundle(_options, bundle) {
      registerAssets(assets, bundle)
    }
  }
}
