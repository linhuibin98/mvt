import fs from 'fs'
import { parse } from '@vue/compiler-sfc'
import slash from 'slash'

const cache = new Map()

export function parseSFC(filename) {
    filename = slash(filename)
    const content = fs.readFileSync(filename, 'utf-8')
    const { descriptor, errors } = parse(content, {
        filename
    })

    if (errors) {
        // TODO
    }

    const prev = cache.get(filename)
    cache.set(filename, descriptor)

    return [descriptor, prev]
}
