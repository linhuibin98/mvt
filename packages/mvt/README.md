# mvt

> No-bundle Dev Server for Vue Single-File Components

**⚠️ Warning: Experimental ⚠️**

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
