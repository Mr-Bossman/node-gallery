import Koa from 'koa'
import { getSettings } from './service.js'
import { router } from './routes.js'
import send from 'koa-send'
import { TEMPLATE_DIR } from './constants.js'

export const app = new Koa()

// Use router middleware
app.use(router.routes()).use(router.allowedMethods())

// Default 404 handler
app.use(async (ctx) => {
    ctx.status = 404
    await send(ctx, '404.html', { root: TEMPLATE_DIR })
})

// Start to listen
const port: number = getSettings().port
app.listen(port, function() {
    console.log(`Node gallery service is listening on ${port}...`)
})
