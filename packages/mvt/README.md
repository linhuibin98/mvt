# mvt

> No-bundle Dev Server for Vue 3 Single-File Components.

Create the following files:

**index.html**

```html
<div id="app"></div>
<script type="module">
  import { createApp } from 'vue'
  import Comp from './Comp.vue'
  createApp(Comp).mount('#app')
</script>
```

**Comp.vue**

```vue
<template>
  <button @click="count++">{{ count }}</button>
</template>
<script>
export default {
  data: () => ({ count: 0 })
}
</script>
<style scoped>
button { color: red }
</style>
```

```bash
npx mvt
```

`npx` will automatically install `mvt` to `npm`'s global cache before running it. Go to `http://localhost:3000`, edit the `.vue` file to see changes hot-updated instantly.

## How It Works

Imports are requested by the browser as native ES module imports - there's no bundling. The server intercepts requests to `*.vue` files, compiles them on the fly, and sends them back as JavaScript.

## Building for Production

Starting with version `^0.5.0`, you can run `mvt build` to bundle the app and deploy it for production.

- `mvt build --root dir`: build files in the target directory instead of current working directory.

- `mvt build --cdn`: import `vue` from a CDN link in the built js. This will make the build faster, but overall the page payload will be larger because therer will be no tree-shaking for Vue APIs.

Internally, we use a highly opinionated Rollup config to generate the build. There is currently intentionally no exposed way to configure the build -- we will likely tackle that at a later stage.

### API

#### Dev Server

You can customize the server using the API. The server can accept plugins which have access to the internal Koa app instance. You can then add custom Koa middlewares to add pre-processor support:

``` js
const { createServer } = require('@unbundle/mvt')
const myPlugin = ({
  root, // project root directory, absolute path
  app, // Koa app instance
  server, // raw http server instance
  watcher // chokidar file watcher instance
}) => {
  app.use(async (ctx, next) => {
    // You can do pre-processing here - this will be the raw incoming requests
    // before mvt touches it.
    if (ctx.path.endsWith('.scss')) {
      // Note vue <style lang="xxx"> are supported by
      // default as long as the corresponding pre-processor is installed, so this
      // only applies to <link ref="stylesheet" href="*.scss"> or js imports like
      // `import '*.scss'`.
      console.log('pre processing: ', ctx.url)
      ctx.type = 'css'
      ctx.body = 'body { border: 1px solid red }'
    }
    // ...wait for mvt to do built-in transforms
    await next()
    // Post processing before the content is served. Note this includes parts
    // compiled from `*.vue` files, where <template> and <script> are served as
    // `application/javascript` and <style> are served as `text/css`.
    if (ctx.response.is('js')) {
      console.log('post processing: ', ctx.url)
      console.log(ctx.body) // can be string or Readable stream
    }
  })
}
createServer({
  plugins: [
    myPlugin
  ]
}).listen(3000)
```

#### Build

``` js
const { build } = require('@unbundle/mvt')
;(async () => {
  // All options are optional.
  // check out `src/node/build.ts` for full options interface.
  const result = await build({
    rollupInputOptions: {
      // https://rollupjs.org/guide/en/#big-list-of-options
    },
    rollupOutputOptions: {
      // https://rollupjs.org/guide/en/#big-list-of-options
    },
    rollupPluginVueOptions: {
      // https://github.com/vuejs/rollup-plugin-vue/tree/next#options
    },
    root: process.cwd(),
    cdn: false,
    write: true,
    minify: true,
    silent: false
  })
})()
```

## TODOs

- Source Map support
- Auto loading postcss config

## License

MIT
