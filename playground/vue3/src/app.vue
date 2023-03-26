<template>
    <div id="app">
        <h1>{{ msg }}</h1>
        <Demo />
    </div>
</template>

<script>
import Demo from './components/demo.vue'

export default {
    name: 'App',
    components: {
        Demo
    },
    setup() {
        return {
            msg: 'Hi, vue app'
        }
    }
}
</script>

<style>
#app h1 {
    color: green;
    font-size: 34px;
}
</style>
