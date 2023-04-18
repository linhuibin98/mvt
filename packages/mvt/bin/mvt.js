#!/usr/bin/env node
const chalk = require('chalk')
const argv = require('minimist')(process.argv.slice(2))
const getIPv4AddressList = require('../dist/utils').getIPv4AddressList

console.log(chalk.cyan(`mvt v${require('../package.json').version}`))

Object.keys(argv).forEach((key) => {
    if (argv[key] === 'false') {
        argv[key] = false
    }
})

if (argv._[0] === 'build') {
    console.log(chalk.yellow('Building for production...'))
    require('../dist')
        .build({
            ...argv,
            cdn: argv.cdn === 'false' ? false : argv.cdn
        })
        .catch((err) => {
            console.error(chalk.red(`[mvt] Build errored out.`))
            console.log(err)
        })
} else {
    const server = require('../dist/index').createServer(argv)

    let port = argv.port || 3000

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use, trying another one...`)
            setTimeout(() => {
                server.close()
                server.listen(++port)
            }, 100)
        } else {
            console.error(chalk.red(`[mvt] server error:`))
            console.error(e)
            reject(e)
        }
    })

    server.on('listening', () => {
        console.log(`Dev server running at:`)
        getIPv4AddressList().forEach((ip) => {
            console.log(`  > http://${ip}:${port}`)
        })
        console.log(' ')
    })

    server.listen(port)
}
