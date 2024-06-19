/**
 * Interface of settings. The settings file is `gallery-settings.json`.
 * @see SETTINGS_FILE
 */
export interface Settings {
    // The name of the website
    ['site-name']: string

    // The port the server listens on
    port: number

    // An array of regular expressions used to exclude files.
    // Any file whose path matches any of these regular expressions will be filtered out and not
    // included when the webpage is generated.
    exclude: string[],

    // Featured section images
    featured: string[]

    // Other sections
    sections: { [sectionName: string]: Section }

    // Available cache sizes
    ['cache-sz']: string[],
}

export interface Section {
    // Section title
    title: string,

    // Section description
    description: string,

    // Included images
    includes: string[]
}
