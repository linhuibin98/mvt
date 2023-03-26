import type {Plugin} from '../index'

export const servePlugin: Plugin = ({ root, app }) => {
    app.use(require('koa-static')(root))
}
