import * as fs from 'node:fs'
import { hashSync } from 'hasha'
import { Section, Settings } from './settings.js'
import { SETTINGS_FILE, SITEMAP, TEMPLATE_HTML_FILE } from './constants.js'
import { collectImagePaths, getSettings } from './service.js'
import { JSDOM } from 'jsdom'

/**
 * Abstract class defining a resource monitor that manages a resource and its content.
 * @template R Type parameter for the resource. It should not include the undefined type.
 * @template C Type parameter for the content derived from the resource.
 */
export abstract class ResourceMonitor<R, C> {
    /**
     * Store the hash of the resource.
     * @protected
     */
    protected hash ?: string

    /**
     * Store the content derived from the resource.
     * @protected
     */
    protected content ?: C

    /**
     * Abstract method to compute the hash of a given resource.
     * @param {R} resource - The resource for which to compute the hash.
     * @returns {string} The computed hash as a string.
     */
    protected abstract computeHash(resource: R): string;

    /**
     * Abstract method to get the current resource.
     * @returns {R} The current resource of type R.
     */
    public abstract getResource(): R;

    /**
     * Abstract method to transform the resource into content of type C.
     * @param {R} resource - The resource to transform.
     * @returns {C} The transformed content of type C.
     */
    public abstract transformResourceToContent(resource: R): C;

    /**
     * Method to get the content derived from the resource, optionally checking for updates.
     * @param {boolean} checkUpdate - Flag indicating whether to check for updates (default: true).
     * @returns {C} The content derived from the resource of type C.
     */
    public getContent(checkUpdate: boolean = true): C {
        if (this.content === undefined) {
            checkUpdate = true
        }

        if (checkUpdate) {
            const resource: R = this.getResource()
            const newHash = this.computeHash(resource)
            if (newHash !== this.hash) {
                this.hash = newHash
                this.content = this.transformResourceToContent(resource)
            }
        }

        return this.content as C
    }
}

export class FileMonitor<C = string> extends ResourceMonitor<string, C> {
    /**
     * Constructor for FileHashMonitor.
     * @param {string} filePath - The path to the file whose hash is to be monitored.
     */
    public constructor(private readonly filePath: string) {
        super()
    }

    /**
     * Computes the hash of the given file content.
     * @param {string} resource - The content of the file as a string.
     * @returns {string} The computed hash of the file content.
     */
    public override computeHash(resource: string): string {
        return hashSync(resource)
    }

    /**
     * Retrieves the content of the file specified by filePath.
     * @returns {string} The content of the file as a string.
     */
    public override getResource(): string {
        return fs.readFileSync(this.filePath).toString('utf-8')
    }

    /**
     * Transforms the file content into its original string form.
     * @param {string} resource - The content of the file as a string.
     * @returns {string} The file content as a string.
     */
    public override transformResourceToContent(resource: string): C {
        return resource as C
    }
}

/**
 * Class that monitors the hash of settings defined in a file.
 */
export class SettingsMonitor extends FileMonitor<Settings> {
    public constructor() {
        super(SETTINGS_FILE)
    }

    /**
     * Parses the settings string into a Settings object.
     * @param {string} settingsString - The settings as a string.
     * @returns {Settings} The parsed Settings object.
     */
    public override transformResourceToContent(settingsString: string): Settings {
        return JSON.parse(settingsString)
    }
}

/**
 * The resources for the WebpageHashMonitor to monitor.
 */
export interface WebpageHashMonitorResource {
    settings: string
    indexHtml: string
    imagePaths: string
}

/**
 * Class that monitors the hash of the following resources: settings, index.html (template), and the
 * image paths in the `gallery` directory.
 */
export class WebpageResourceMonitor extends ResourceMonitor<WebpageHashMonitorResource, string> {
    private static readonly RERENDER_INTERVAL = 1000

    private rerenderReady: boolean = true

    constructor() {
        super()

        // To avoid bouncing caused by repeating requests within a short period, the webpage
        // rerendering has a 1000ms cooldown
        setInterval(() => {
            this.rerenderReady = true
        }, WebpageResourceMonitor.RERENDER_INTERVAL)
    }

    public override computeHash(resource: WebpageHashMonitorResource): string {
        return hashSync(Object.entries(resource).map(([key, value]) => `${key}:${value}`))
    }

    public override getResource(): WebpageHashMonitorResource {
        return {
            settings: settingsMonitor.getResource(),
            indexHtml: fs.readFileSync(TEMPLATE_HTML_FILE).toString('utf-8'),
            imagePaths: collectImagePaths().join(';'),
        }
    }

    public override getContent(checkUpdate: boolean = true): string {
        if (checkUpdate && this.rerenderReady) {
            this.rerenderReady = false
            return super.getContent()
        }

        return super.getContent(false)
    }

    public override transformResourceToContent(): string {
        // To avoid making the project complicated, we shouldn't introduce a log library or system
        // for the time being
        console.log(
            '[' + new Date().toISOString() +
            '] Modification detected. Rendering HTML content...')

        const settings: Settings = settingsMonitor.getContent()
        const featured: Settings['featured'] = settings.featured
        const sections: Settings['sections'] = settings.sections
        const imagePaths: string[] = collectImagePaths()
        const imagePathSet: Set<string> = new Set() // Images not in featured and any sections
        featured.forEach(feature => imagePathSet.add(feature))

        const dom: JSDOM = this.getTemplateHtmlDom()
        const document: Document = dom.window.document
        const $gallery = document.getElementById('gallery') as HTMLElement

        // Feature section is always at the top
        $gallery.appendChild(this.create$section(document, {
            title: 'Featured:',
            description: '',
            includes: featured,
        } as Section, 'featured', imagePaths))

        for (const [sectionName, section] of Object.entries(sections)) {
            $gallery.appendChild(this.create$section(document, section, sectionName, imagePaths))
            section.includes.forEach(image => imagePathSet.add(image))
        }

        // Global section includes all the images that are not in any sections (including the
        // featured section)
        $gallery.appendChild(this.create$section(document, {
            title: 'Photos:',
            description: '',
            includes: collectImagePaths().filter(imagePath => !imagePathSet.has(imagePath)),
        } as Section, 'global', imagePaths))

        return dom.serialize()
    }

    private getTemplateHtmlDom(): JSDOM {
        const templateHtmlContent: string = fs.readFileSync(TEMPLATE_HTML_FILE).toString('utf-8')
        return new JSDOM(templateHtmlContent)
    }

    private create$section(
        document: Document,
        section: Section,
        sectionName: string,
        imagePaths: string[],
    ): HTMLElement {
        const settings = settingsMonitor.getContent(false)
        const defaultSize = settings['cache-sz'][0]

        const $section = document.createElement('div')
        $section.id = `${sectionName}-section`
        $section.appendChild(
            this.create$sectionHeaderWrapper(document, section.title, section.description))
        $section.appendChild(
            this.create$sectionImages(document, section.includes, defaultSize, sectionName, imagePaths))

        return $section
    }

    private create$sectionHeaderWrapper(
        document: Document,
        title: Section['title'],
        description: Section['description'],
    ): HTMLDivElement {
        const $sectionHeaderWrapper: HTMLElement = document.createElement('div')
        $sectionHeaderWrapper.appendChild(this.create$sectionTitle(document, title))
        $sectionHeaderWrapper.appendChild(this.create$sectionDescription(document, description))
        $sectionHeaderWrapper.className = 'section-header-wrapper'

        return $sectionHeaderWrapper as HTMLDivElement
    }

    private create$sectionTitle(document: Document, title: Section['title']): HTMLDivElement {
        const $sectionTitle: HTMLElement = document.createElement('div')
        $sectionTitle.textContent = title
        $sectionTitle.className = 'section-title'

        return $sectionTitle as HTMLDivElement
    }

    private create$sectionDescription(
        document: Document,
        description: Section['description'],
    ): HTMLDivElement {
        const $sectionDescription: HTMLElement = document.createElement('div')
        $sectionDescription.textContent = description
        $sectionDescription.className = 'section-description'

        return $sectionDescription as HTMLDivElement
    }

    private create$sectionImages(
        document: Document,
        imagePaths: string[],
        imageSize: string,
        sectionName: string,
        existedImagePaths: string[],
    ): HTMLDivElement {
        const $sectionImages: HTMLDivElement = document.createElement('div')
        $sectionImages.classList.add('section-images')
        $sectionImages.classList.add(`${sectionName}-gallery`)

        for (const imagePath of imagePaths.filter(image => existedImagePaths.includes(image))) {
            $sectionImages.appendChild(this.create$image(document, imagePath, imageSize))
        }

        return $sectionImages as HTMLDivElement
    }

    private create$image(document: Document, imagePath: string, size: string): HTMLDivElement {
        const $img: HTMLImageElement = document.createElement('img')
        $img.className = 'lozad'
        $img.src = `image/${imagePath}?sz=${size}`
        $img.setAttribute('data-src', $img.src)

        const $a: HTMLAnchorElement = document.createElement('a')
        $a.className = 'section-image'
        $a.href = `image/${imagePath}`
        $a.setAttribute('data-pswp-width', '6000')
        $a.setAttribute('data-pswp-height', '3376')
        $a.setAttribute('data-pswp-src', `image/${imagePath}`)
        $a.setAttribute('target', '_blank')
        $a.appendChild($img)

        const $image: HTMLDivElement = document.createElement('div')
        $image.className = 'img-hover'
        $image.appendChild($a)

        return $image as HTMLDivElement
    }
}

export interface SitemapResource {
    imagePaths: string
}

export class SitemapResourceMonitor extends ResourceMonitor<SitemapResource, string> {
    private static readonly SEPARATOR = ';'

    protected computeHash(resource: SitemapResource): string {
        return hashSync(Object.entries(resource).map(([key, value]) => `${key}:${value}`))
    }

    public getResource(): SitemapResource {
        return {
            imagePaths: collectImagePaths().join(SitemapResourceMonitor.SEPARATOR),
        }
    }

    public transformResourceToContent(resource: SitemapResource): string {
        const nowDate: string = new Date(Date.now()).toISOString().split('T')[0]
        const siteName: string = getSettings()['site-name']
        let sitemapXml: string =
            `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`
        SITEMAP.forEach(function(url) {
            const loc = `https://${siteName}/${url}`
            sitemapXml += `<url>\n<loc>${loc}</loc>\n<lastmod>${nowDate}</lastmod>\n</url>\n`
        })

        // Add image urls
        resource.imagePaths.split(SitemapResourceMonitor.SEPARATOR).forEach((imagePath) => {
            const url = `image/${imagePath}`
            const loc = `https://${siteName}/${url}`
            sitemapXml += `<url>\n<loc>${loc}</loc>\n<lastmod>${nowDate}</lastmod>\n</url>\n`
        })

        sitemapXml += '</urlset>'

        return sitemapXml
    }
}

export const settingsMonitor = new SettingsMonitor()
export const webpageResourceMonitor = new WebpageResourceMonitor()
export const sitemapResourceMonitor = new SitemapResourceMonitor()
