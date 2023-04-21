<template>
  <button @click="count++">{{ count }}</button>
  <Child />
  <Json />
</template>

<script>
import { ref } from 'vue'
import Child from './Child.vue'
import Json from './Json.vue'
export default {
  components: { Child, Json },
  setup() {
    return {
      count: ref(0)
    }
  }
}
</script>
