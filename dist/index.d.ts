/// <reference types="firefox-webext-browser" />
import { Compiler, Compilation, Stats } from "webpack";
interface Notification {
    action: string;
    changedFiles: string[];
}
export interface WebextensionPluginOptions {
    port?: number;
    host?: string;
    reconnectTime?: number;
    autoreload?: boolean;
    vendor?: string;
    manifestDefaults?: object;
    quiet?: boolean;
    skipManifestValidation?: boolean;
}
export default class WebextensionPlugin {
    port: number;
    host: string;
    autoreload: boolean;
    reconnectTime: number;
    vendor: string;
    manifestDefaults: object;
    quiet: boolean;
    skipManifestValidation: boolean;
    server: any;
    isWatching: boolean;
    manifestChanged: boolean;
    clientAdded: boolean;
    startTime: number;
    readFile: any;
    sources: any;
    cleanPlugin: any;
    notifyExtension: (data: Notification) => void;
    client: any;
    vendors: string[];
    backgroundPagePathDefault: string;
    manifestNameDefault: string;
    constructor({ port, host, reconnectTime, autoreload, vendor, manifestDefaults, quiet, skipManifestValidation, }?: WebextensionPluginOptions);
    /**
     * Install plugin (install hooks)
     *
     * @param compiler Compiler
     */
    apply(compiler: Compiler): void;
    /**
     * Webpack watchRun hook
     *
     * @param compiler Compiler
     */
    watchRun(compiler: Compiler): Promise<void>;
    /**
     * Webpack compilation hook
     *
     * @param {Object} compilation
     */
    compilation(compilation: Compilation): void;
    /**
     * Webpack make hook
     *
     * @param compilation Compilation
     */
    make(compilation: Compilation): Promise<void>;
    /**
     * Webpack afteCompile hook
     *
     * @param compilation Compilation
     */
    afterCompile(compilation: Compilation): void;
    /**
     * Add manifest to the filesDependencies
     *
     * @param compilation Compilation
     */
    watchManifest(compilation: Compilation): void;
    /**
     * Webpack done hook
     *
     * @param stats Stats
     */
    done(stats: Stats): void;
    /**
     * Prevents deletion of manifest.json and background_page.js files by clean plugin
     *
     * @param compilation Compilation
     */
    keepFiles(compilation: Compilation): void;
    /**
     * Detect changed files
     *
     * @param compiler Compiler
     */
    detectManifestModification(compiler: Compiler): void;
    /**
     * Start websocket server
     * on watch mode
     */
    startServer(): Promise<void>;
    /**
     * Namespaced logger
     */
    log(...optionalParams: any[]): void;
    /**
     * Add the client script to assets
     * when autoreload enabled and is watching
     *
     * @param compilation Compilation
     */
    addClient(compilation: Compilation): Promise<void>;
    /**
     * Compile the client only once
     * and add it to the assets output
     */
    compileClient(): Promise<any>;
    /**
     * Compile manifest and add it
     * to the asset ouput
     *
     * @param compilation Compilation
     */
    addManifest(compilation: Compilation): Promise<void>;
    /**
     * Send message to extensions with
     * changed files
     *
     * @param stats Stats
     */
    reloadExtensions(stats: Stats): void;
    /**
     * Get the changed files since
     * last compilation
     *
     * @param compilation Compilation
     */
    extractChangedFiles({ emittedAssets }: Compilation): string[];
    /**
     * Transform manifest keys
     *
     * @param manifest browser._manifest.WebExtensionManifest
     * @param vendor string
     * @returns browser._manifest.WebExtensionManifest
     */
    transformManifestVendorKeys(manifest: browser._manifest.WebExtensionManifest, vendor: string): browser._manifest.WebExtensionManifest;
    /**
     * Transform Manifest Values from ENV
     * @param manifest browser._manifest.WebExtensionManifest
     * @returns browser._manifest.WebExtensionManifest
     */
    transformManifestValuesFromENV(manifest: browser._manifest.WebExtensionManifest): browser._manifest.WebExtensionManifest;
    /**
     * Add Background Script to reload extension in dev mode
     */
    addBackgroundscript(manifest: browser._manifest.WebExtensionManifest, compilation: Compilation): Promise<browser._manifest.WebExtensionManifest>;
}
export {};
