<template>
  <div :class="$style.demo">
    <div>
      count: {{ count }}
      <button @click="increase">+1</button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import {add} from '../common/utils.js'

export default {
  name: 'Demo',
  setup() {
    const count = ref(0)
    const increase = () => count.value = add(count.value, 1)
    return {
      count,
      increase
    }
  }
}
</script>

<style scoped module>
.demo {
  font-size: 20px;
  color: red;
}
</style>
