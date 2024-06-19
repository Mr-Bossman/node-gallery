import { compressAndGetImageCachePath, getSettings } from './service.js'
import { CACHE_DIR, GALLERY_DIR, QUERY_STRING_KEYS, TEMPLATE_DIR } from './constants.js'
import send from 'koa-send'
import { sitemapResourceMonitor, webpageResourceMonitor } from './resource_monitor.js'
import KoaRouter from 'koa-router'

export const router = new KoaRouter()

/**
 * Serves the index HTML page of the application.
 * @route
 */
router.get('/', async (ctx) => {
    ctx.response.body = webpageResourceMonitor.getContent(true)
})

/**
 * Serves the CSS file used for styling the application.
 * @route
 */
router.get('/(css/.*\.css)', async (ctx) => {
    const file: string = ctx.params[0]
    await send(ctx, file, { root: TEMPLATE_DIR })
})

/**
 * Retrieves and sends an image based on the provided file path and optional size query parameter.
 * If the size parameter is not supported, the original image is sent.
 * @route
 */
router.get('/image/(.*)', async (ctx) => {
    const settings = getSettings()
    const querySize: string = ctx.request.query[QUERY_STRING_KEYS.SIZE] as string
    const size: string = settings['cache-sz'].includes(querySize) ? querySize : ''
    const imagePath: string = ctx.params[0]

    if (size) {
        // Send the compressed image (cache)
        const imageCachePath: string = await compressAndGetImageCachePath(imagePath, size)
        await send(ctx, imageCachePath, { root: CACHE_DIR })
    } else {
        // Send the original image
        await send(ctx, imagePath, { root: GALLERY_DIR })
    }
})

/**
 * Serves the sitemap.
 * @route
 */
router.get('/sitemap.xml', async (ctx) => {
    ctx.response.body = sitemapResourceMonitor.getContent()
})
