import * as path from 'node:path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Looks like module does not support __dirname, and we have to create it on our own
// Here, __dirname is the relative path of `src/`
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Significant directories and files
export const ROOT_DIR = path.resolve(__dirname, '..')
export const GALLERY_DIR = path.join(ROOT_DIR, 'gallery')
export const CACHE_DIR = path.join(ROOT_DIR, 'cache')
export const TEMPLATE_DIR = path.join(ROOT_DIR, 'src/template')
export const SETTINGS_FILE = path.join(ROOT_DIR, 'gallery-settings.json')
export const TEMPLATE_HTML_FILE = path.join(TEMPLATE_DIR, 'index.html')

// Query string keys
export const QUERY_STRING_KEYS = {
    SIZE: 'sz',
} as const

// Sitemap
export const SITEMAP = [
    '',
    'sitemap.xml',
    'robots.txt',
    'favicon.ico',
    'index.css',
] as const
