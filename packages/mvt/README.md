# mvt

> No-bundle Dev Server for Vue Single-File Components

**⚠️ Warning: Experimental ⚠️**

Create the following files:

**index.html**

```html
<div id="app"></div>
<script type="module" src="/main.js"></script>
```

**main.js**

```js
import { createApp } from 'vue'
import Comp from './Comp.vue'
createApp(Comp).mount('#app')
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

## How It Works

Imports are requested by the browser as native ES module imports - there's no bundling.

The server intercepts requests to *.vue files, compiles them on the fly, and sends them back as JavaScript.

For libraries that provide ES modules builds that work in browsers, just directly import them from a CDN.

Imports to npm packages inside .js files (package name only) are re-written on the fly to point to locally installed files. Currently, only vue is supported as a special case. Other packages will likely need to be transformed to be exposed as a native browser-targeting ES module.
