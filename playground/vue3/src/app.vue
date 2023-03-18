<template>
    <div id="app">
        {{ msg }}
    </div>
</template>

<script>

export default {
    name: 'App',
    setup() {
        return {
            msg: 'Hi, vue app'
        }
    }
}
</script>

<style>
#app {
    color: green;
    font-size: 34px;
}
</style>
