import * as fs from 'node:fs'
import * as path from 'node:path'
import { compressAndGetImageCachePath, getSettings } from './service.js'
import { ROOT_DIR, GALLERY_DIR, QUERY_STRING_KEYS, TEMPLATE_DIR } from './constants.js'
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
 * Serves the favicon file used for the application icon.
 * @route
 */
router.get('/favicon.ico', async (ctx) => {
    await send(ctx, '/favicon.ico', { root: TEMPLATE_DIR })
})

/**
 * Serves the CSS file used for styling the application.
 * @route
 */
router.get('/(css/.*\.css)', async (ctx) => {
    const file: string = ctx.params[0]
    if (!fs.existsSync(path.join(TEMPLATE_DIR, path.normalize(file)))) {
        // File not found send 404
        ctx.status = 404
        await send(ctx, '404.html', { root: TEMPLATE_DIR })
    } else {
        await send(ctx, file, { root: TEMPLATE_DIR })
    }
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

    if (!fs.existsSync(path.join(GALLERY_DIR, path.normalize(imagePath)))) {
        // Image not found send 404
        ctx.status = 404
        await send(ctx, '404.html', { root: TEMPLATE_DIR })
    } else if (size) {
        // Send the compressed image (cache)
        const imageCachePath: string = await compressAndGetImageCachePath(imagePath, size, settings['compression-timeout'])
        await send(ctx, imageCachePath, { root: ROOT_DIR })
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
