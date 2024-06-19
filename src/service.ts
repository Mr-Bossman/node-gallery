import * as fs from 'node:fs'
import * as path from 'node:path'
import { Settings } from './settings.js'
import { CACHE_DIR, GALLERY_DIR } from './constants.js'
import { exec } from 'child_process'
import { settingsMonitor } from './resource_monitor.js'

/**
 * Recursively collects all file paths from a specified directory.
 *
 * @param {string} rootDir - The root directory from which to start collecting file paths.
 * @param {string} [relativeDir='.'] - The relative directory path from the root directory.
 * @returns An array of relative file paths.
 */
export function collectFilePaths(rootDir: string, relativeDir: string = '.'): string[] {
    try {
        const absoluteDirPath: string = path.resolve(rootDir, relativeDir)
        const collectedFilePaths: string[] = []

        fs.readdirSync(absoluteDirPath).forEach(fileName => {
            const absoluteFilePath = path.join(absoluteDirPath, fileName)
            const relativeFilePath: string = path.join(relativeDir, fileName)

            if (fs.statSync(absoluteFilePath).isDirectory()) {
                collectedFilePaths.push(...collectFilePaths(rootDir, relativeFilePath))
            } else {
                collectedFilePaths.push(relativeFilePath)
            }
        })

        return collectedFilePaths
    } catch (error) {
        console.error(`Error while collecting file paths: ${error}`)
        return []
    }
}

/**
 * Determines whether an image should be included based on its path.
 *
 * This function checks the given image path against an array of exclusion regular expressions
 * stored in the settings. If the basename of the image path matches any of the exclusion patterns,
 * the image is excluded; otherwise, it is included.
 *
 * @param {string} imagePath - The file path of the image to be checked.
 * @returns {boolean} Returns true if the image should be included (i.e., does not match any
 * exclusion patterns); otherwise, false.
 */
export function shouldIncludeImage(imagePath: string): boolean {
    const settings: Settings = settingsMonitor.getContent()
    return !settings['exclude'].some(regex => new RegExp(regex).test(path.basename(imagePath)))
}

/**
 * Recursively collects image files from the `gallery` directory. Images will be excluded based on
 * the shouldIncludeImage predicate.
 *
 * @see shouldIncludeImage
 */
export function collectImagePaths(): string[] {
    return collectFilePaths(GALLERY_DIR).filter(shouldIncludeImage)
}

/**
 * Generates a cache path for an image based on its original path and the desired size.
 *
 * This function constructs a cache path by transforming the directory structure of the original
 * image path into a single string and appending the desired size and original file name. The
 * resulting path is resolved within a predefined cache directory.
 *
 * @param {string} imagePath - The original file path of the image.
 * @param {string} size - The desired size identifier for the cached image.
 * @returns {string} The resolved cache path for the image.
 */
export function getImageCachePath(imagePath: string, size: string): string {
    const dirString: string = path.dirname(imagePath).split('/').join('_')
    const dirStringWithoutLeadingDot: string
        = dirString.startsWith('.') ? dirString.substring(1) : dirString
    const fileName = path.basename(imagePath)

    return path.join(CACHE_DIR, `${dirStringWithoutLeadingDot}_${size}_${fileName}`)
}

/**
 * Compresses an image to a specified size using the jpegoptim tool.
 *
 * @param {string} imagePath - The path to the input image to be compressed.
 * @param {string} size - The maximum size of the output image in kilobytes (e.g., "100k").
 * @param {string} outputImagePath - The path where the compressed image will be saved.
 * @returns {Promise<void>} - A promise that resolves when the image has been successfully
 * compressed.
 * @throws {Error} - Throws an error if the compression command fails.
 */
export async function compressImage(
    imagePath: string,
    size: string,
    outputImagePath: string,
): Promise<void> {
    const resizeCommand: string
        = `jpegoptim --stdout -sqf -S${size} ${imagePath} > ${outputImagePath}`
    return new Promise((resolve, reject) => {
        exec(resizeCommand, (error, _, stderr) => {
            if (error) {
                reject(stderr)
            } else {
                resolve()
            }
        })
    })
}

/**
 * Compresses the original image at a given path to a specified size if a cached version
 * does not exist, returning the path to the cached image.
 *
 * This function checks if a cached version of the image already exists. If not, it compresses
 * the original image from the gallery directory to the desired size using the `compressImage`
 * function. The resulting cached image path is then returned.
 *
 * @param {string} imagePath - The relative path to the original image within the gallery directory.
 * @param {string} size - The desired size identifier for the cached image (e.g., "100k").
 * @returns {Promise<string>} - A promise resolving to the relative path of the cached image.
 */
export async function compressAndGetImageCachePath(
    imagePath: string,
    size: string,
): Promise<string> {
    const originalImagePath: string = path.join(GALLERY_DIR, imagePath)

    const imageCachePath: string = getImageCachePath(imagePath, size)
    if (!fs.existsSync(imageCachePath)) {
        // Create a cache file if not exist
        await compressImage(originalImagePath, size, imageCachePath)
    }

    return imageCachePath.substring(CACHE_DIR.length + 1)
}

/**
 * Retrieves the application settings, optionally checking for updates.
 *
 * @param {boolean} [checkUpdate=false] - A boolean indicating whether to check for updates before
 * retrieving settings.
 * @returns {Settings} - The application settings.
 */
export function getSettings(checkUpdate: boolean = false): Settings {
    return settingsMonitor.getContent(checkUpdate)
}
