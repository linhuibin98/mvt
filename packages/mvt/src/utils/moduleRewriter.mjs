import { parse } from '@babel/parser'
import ms from 'magic-string'

export function rewrite(source, asSFCScript = false) {
    const ast = parse(source, {
        sourceType: 'module',
        plugins: [
            // by default we enable proposals slated for ES2020.
            // full list at https://babeljs.io/docs/en/next/babel-parser#plugins
            // this will need to be updated as the spec moves forward.
            'bigInt',
            'optionalChaining',
            'nullishCoalescingOperator'
        ]
    }).program.body

    let s

    ast.forEach((node) => {
        if (node.type === 'ImportDeclaration') {
            // Not . and / paths starting with
            if (/^[^\.\/]/.test(node.source.value)) {
                // module import
                // import { foo } from 'vue' --> import { foo } from '/__modules/vue'
                ; (s || (s = new ms(source))).overwrite(
                    node.source.start,
                    node.source.end,
                    `"/__modules/${node.source.value}"`
                )
            } 
        } else if (node.type === 'ExportDefaultDeclaration') {
            // export default test  --> let __script; export default (__script = test)
            ; (s || (s = new ms(source))).overwrite(
                node.start,
                node.declaration.start,
                `let __script; export default (__script = `
            )
            s.appendRight(node.end, `)`)
        }
    })

    return s ? s.toString() : source
}
