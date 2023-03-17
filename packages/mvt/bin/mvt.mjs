#!/usr/bin/env node
import('../src/server.mjs').catch(err => {
    console.error(err);
    process.exit(1);
})
