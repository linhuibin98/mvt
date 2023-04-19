<template>
    <div id="app">
        <h1>{{ msg }}</h1>
        <div class="head"></div>
        <Demo />
    </div>
</template>

<script>
import Demo from './components/demo.vue'
import dataJson from './common/data.json'
// import headPng from '../asset/img/head.png'

// console.log('headPng',headPng)

// Dynamic Import
import('./common/utils').then(mod => {
    console.log('Dynamic Import utils.add(1, 2)',mod.add(1, 2));
})

console.log('dataJson',dataJson)

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
.head {
    width: 300px;
    height: 300px;
    background: url('../asset/img/head.png') no-repeat;
}
</style>
