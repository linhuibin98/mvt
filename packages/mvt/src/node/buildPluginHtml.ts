import { scriptRE } from './utils'
import {normalizePath} from '@rollup/pluginutils'

import type { Plugin } from 'rollup'

export const createBuildHtmlPlugin = (
    indexPath: string,
    indexContent: string
): Plugin => {
    return {
        name: 'mvt:html',
        load(id) {
            id = normalizePath(id)
            if (id === indexPath) {
                let script = ''
                let match
                while ((match = scriptRE.exec(indexContent))) {
                    // TODO handle <script type="module" src="..."/>
                    // just add it as an import
                    script += match[1]
                }
                return script
            }
        }
    }
}
