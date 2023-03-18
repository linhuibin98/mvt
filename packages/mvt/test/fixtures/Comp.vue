<template>
  <button @click="count++">{{ count }}</button>
  <Child />
</template>

<script>
import {ref} from 'vue';
import Child from './Child.vue'
export default {
  components: { Child },
  setup() {
    return {
      count: ref(0)
    }
  }
}
</script>
