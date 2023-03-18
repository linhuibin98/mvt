#!/usr/bin/env node
import { createServer } from '../src/server.mjs'

// TODO pass cli args
createServer().catch(err => {
    console.error(err);
    process.exit(1);
})
