#!/usr/bin/env node
const { createServer } = require('../dist/server')

// TODO pass cli args
createServer().catch(err => {
    console.error(err);
    process.exit(1);
})
