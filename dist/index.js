"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const ws_1 = __importDefault(require("ws"));
const webpack_1 = require("webpack");
const mustache_1 = __importDefault(require("mustache"));
const ajv_1 = __importDefault(require("ajv"));
const vendors_json_1 = __importDefault(require("./vendors.json"));
const manifest_schema_json_1 = __importDefault(require("./manifest.schema.json"));
class WebextensionPlugin {
    constructor({ port = 35729, host = "localhost", reconnectTime = 3000, autoreload = true, vendor = "chrome", manifestDefaults = {}, quiet = false, skipManifestValidation = false, } = {}) {
        // Apply Settings
        this.port = port;
        this.host = host;
        this.autoreload = autoreload;
        this.reconnectTime = reconnectTime;
        this.vendor = vendor;
        this.manifestDefaults = manifestDefaults;
        this.quiet = quiet;
        this.skipManifestValidation = skipManifestValidation;
        // Set some defaults
        this.server = null;
        this.isWatching = false;
        this.manifestChanged = true;
        this.clientAdded = false;
        this.startTime = Date.now();
        this.vendors = vendors_json_1.default;
        this.backgroundPagePathDefault = "webextension-toolbox/background_page.js";
        this.manifestNameDefault = "manifest.json";
        this.notifyExtension = () => { };
    }
    /**
     * Install plugin (install hooks)
     *
     * @param compiler Compiler
     */
    apply(compiler) {
        const { name } = this.constructor;
        const { inputFileSystem } = compiler;
        this.readFile = (0, util_1.promisify)(inputFileSystem.readFile.bind(inputFileSystem));
        this.sources = compiler.webpack.sources;
        this.cleanPlugin = compiler.webpack.CleanPlugin;
        compiler.hooks.watchRun.tapPromise(name, this.watchRun.bind(this));
        compiler.hooks.compilation.tap(name, this.compilation.bind(this));
        compiler.hooks.make.tapPromise(name, this.make.bind(this));
        compiler.hooks.afterCompile.tap(name, this.afterCompile.bind(this));
        compiler.hooks.done.tap(name, this.done.bind(this));
    }
    /**
     * Webpack watchRun hook
     *
     * @param compiler Compiler
     */
    watchRun(compiler) {
        this.isWatching = true;
        this.detectManifestModification(compiler);
        return this.startServer();
    }
    /**
     * Webpack compilation hook
     *
     * @param {Object} compilation
     */
    compilation(compilation) {
        this.keepFiles(compilation);
    }
    /**
     * Webpack make hook
     *
     * @param compilation Compilation
     */
    make(compilation) {
        return Promise.all([
            this.addClient(compilation),
            this.addManifest(compilation),
        ]).then(() => { });
    }
    /**
     * Webpack afteCompile hook
     *
     * @param compilation Compilation
     */
    afterCompile(compilation) {
        return this.watchManifest(compilation);
    }
    /**
     * Add manifest to the filesDependencies
     *
     * @param compilation Compilation
     */
    watchManifest(compilation) {
        if (!compilation.options.context) {
            return;
        }
        compilation.fileDependencies.add(path_1.default.join(compilation.options.context, this.manifestNameDefault));
    }
    /**
     * Webpack done hook
     *
     * @param stats Stats
     */
    done(stats) {
        this.reloadExtensions(stats);
    }
    /**
     * Prevents deletion of manifest.json and background_page.js files by clean plugin
     *
     * @param compilation Compilation
     */
    keepFiles(compilation) {
        if (this.cleanPlugin) {
            this.cleanPlugin
                .getCompilationHooks(compilation)
                .keep.tap(this.constructor.name, (asset) => asset === this.manifestNameDefault ||
                (asset === this.backgroundPagePathDefault &&
                    this.autoreload &&
                    this.isWatching));
        }
    }
    /**
     * Detect changed files
     *
     * @param compiler Compiler
     */
    detectManifestModification(compiler) {
        if (compiler.modifiedFiles && compiler.options.context) {
            const manifestFile = path_1.default.join(compiler.options.context, this.manifestNameDefault);
            this.manifestChanged = compiler.modifiedFiles.has(manifestFile);
        }
    }
    /**
     * Start websocket server
     * on watch mode
     */
    startServer() {
        return new Promise((resolve, reject) => {
            if (!this.autoreload || !this.isWatching || this.server) {
                resolve();
                return;
            }
            const { host, port } = this;
            this.server = new ws_1.default.Server({ port }, () => {
                this.log(`listens on ws://${host}:${port}`);
                resolve();
            });
            this.server.on("error", reject);
            this.notifyExtension = (data) => {
                this.server.clients.forEach((client) => {
                    if (client.readyState === ws_1.default.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            };
        });
    }
    /**
     * Namespaced logger
     */
    log(...optionalParams) {
        if (!this.quiet) {
            console.log("webpack-webextension-plugin", ...optionalParams);
        }
    }
    /**
     * Add the client script to assets
     * when autoreload enabled and is watching
     *
     * @param compilation Compilation
     */
    async addClient(compilation) {
        if (this.autoreload && this.isWatching && !this.clientAdded) {
            // Add client to extension. We will includes this
            // as a background script in the manifest.json later.
            const client = await this.compileClient();
            compilation.emitAsset(this.backgroundPagePathDefault, new this.sources.RawSource(client));
            this.clientAdded = true;
        }
    }
    /**
     * Compile the client only once
     * and add it to the assets output
     */
    async compileClient() {
        // Only compile client once
        if (this.client)
            return this.client;
        // Get the client as string
        const clientPath = path_1.default.resolve(__dirname, "background_page.js");
        const clientBuffer = await this.readFile(clientPath);
        // Inject settings
        this.client = mustache_1.default.render(clientBuffer.toString(), {
            port: this.port,
            host: this.host,
            reconnectTime: this.reconnectTime,
        });
        return this.client;
    }
    /**
     * Compile manifest and add it
     * to the asset ouput
     *
     * @param compilation Compilation
     */
    async addManifest(compilation) {
        if (this.manifestChanged) {
            if (!compilation.options.context) {
                return;
            }
            // Load manifest
            const manifestPath = path_1.default.join(compilation.options.context, this.manifestNameDefault);
            const manifestBuffer = await this.readFile(manifestPath);
            let manifest;
            // Convert to JSON
            try {
                manifest = JSON.parse(manifestBuffer);
            }
            catch (error) {
                throw new Error(`Could not parse ${this.manifestNameDefault}`);
            }
            manifest = {
                ...this.manifestDefaults,
                ...manifest,
            };
            // Transform __chrome__key -> key
            manifest = this.transformManifestVendorKeys(manifest, this.vendor);
            // Transform ENV Values
            manifest = this.transformManifestValuesFromENV(manifest);
            // Validate manifest.json syntax
            if (!this.skipManifestValidation) {
                const ajv = new ajv_1.default();
                const validate = ajv.compile(manifest_schema_json_1.default);
                const valid = validate(manifest);
                if (!valid && validate.errors) {
                    validate.errors.forEach((error) => {
                        const webpackError = new webpack_1.WebpackError(`${error.dataPath} ${error.message}`);
                        webpackError.file = manifestPath;
                        webpackError.details = JSON.stringify(error, null, 2);
                        compilation.errors.push(webpackError);
                    });
                }
            }
            // Add client
            if (this.autoreload && this.isWatching) {
                manifest = await this.addBackgroundscript(manifest, compilation);
            }
            // Create webpack file entry
            const manifestStr = JSON.stringify(manifest, null, 2);
            compilation.emitAsset(this.manifestNameDefault, new this.sources.RawSource(manifestStr));
        }
    }
    /**
     * Send message to extensions with
     * changed files
     *
     * @param stats Stats
     */
    reloadExtensions(stats) {
        // Skip in normal mode
        if (!this.server || !this.isWatching)
            return;
        // Get changed files since last compile
        const changedFiles = this.extractChangedFiles(stats.compilation);
        if (changedFiles.length) {
            this.log("reloading extension...");
            this.notifyExtension({
                action: "reload",
                changedFiles,
            });
        }
    }
    /**
     * Get the changed files since
     * last compilation
     *
     * @param compilation Compilation
     */
    extractChangedFiles({ emittedAssets }) {
        return emittedAssets ? Array.from(emittedAssets) : [];
    }
    /**
     * Transform manifest keys
     *
     * @param manifest browser._manifest.WebExtensionManifest
     * @param vendor string
     * @returns browser._manifest.WebExtensionManifest
     */
    transformManifestVendorKeys(manifest, vendor) {
        const vendorRegExp = new RegExp(`^__((?:(?:${vendors_json_1.default.join("|")})\\|?)+)__(.*)`);
        const transform = (manifestSection) => {
            if (Array.isArray(manifestSection)) {
                return manifestSection.map((m) => transform(m));
            }
            if (typeof manifestSection === "object") {
                return Object.entries(manifestSection).reduce((previousValue, [key, value]) => {
                    const match = key.match(vendorRegExp);
                    if (match) {
                        const v = match[1].split("|");
                        // Swap key with non prefixed name
                        if (v.indexOf(vendor) > -1) {
                            previousValue[match[2]] = value;
                        }
                    }
                    else {
                        previousValue[key] = transform(value);
                    }
                    return previousValue;
                }, {});
            }
            return manifestSection;
        };
        return transform(manifest);
    }
    /**
     * Transform Manifest Values from ENV
     * @param manifest browser._manifest.WebExtensionManifest
     * @returns browser._manifest.WebExtensionManifest
     */
    transformManifestValuesFromENV(manifest) {
        const valueRegExp = /^__(.*)__$/;
        const replace = (value) => {
            var _a;
            const match = value.match(valueRegExp);
            if (match) {
                return (_a = process.env[match[1]]) !== null && _a !== void 0 ? _a : "";
            }
            return value;
        };
        const transform = (manifestSection) => {
            if (Array.isArray(manifestSection)) {
                return manifestSection.map((m) => transform(m));
            }
            if (typeof manifestSection === "object") {
                return Object.entries(manifestSection).reduce((previousValue, [key, value]) => {
                    if (typeof value === "string") {
                        previousValue[key] = replace(value);
                    }
                    else {
                        previousValue[key] = transform(value);
                    }
                    return previousValue;
                }, {});
            }
            if (typeof manifestSection === "string") {
                return replace(manifestSection);
            }
            return manifestSection;
        };
        return transform(manifest);
    }
    /**
     * Add Background Script to reload extension in dev mode
     */
    async addBackgroundscript(manifest, compilation) {
        if (!manifest.background) {
            manifest.background = undefined;
            return manifest;
        }
        if ("page" in manifest.background) {
            const { context } = compilation.options;
            if (!context) {
                // TODO: log this as an error
                return manifest;
            }
            // Insert Page
            const pagePath = path_1.default.join(context, manifest.background.page);
            const pageString = await this.readFile(pagePath, { encoding: "utf8" });
            const bodyEnd = pageString.search(/\s*<\/body>/);
            const backgroundPageStr = `${pageString.substring(0, bodyEnd)}\n<script src="${this.backgroundPagePathDefault}"></script>${pageString.substring(bodyEnd)}`;
            compilation.emitAsset(manifest.background.page, new this.sources.RawSource(backgroundPageStr));
            return manifest;
        }
        if ("service_worker" in manifest.background) {
            const { context } = compilation.options;
            if (!context) {
                // TODO: log this as an error
                return manifest;
            }
            const workerPath = path_1.default.join(context, manifest.background.service_worker);
            const workerString = await this.readFile(workerPath, {
                encoding: "utf8",
            });
            const clientPath = path_1.default.resolve(__dirname, "service_worker.js");
            const clientString = await this.readFile(clientPath, {
                encoding: "utf8",
            });
            const newWorkerString = `${clientString}\n${workerString}`;
            compilation.emitAsset(manifest.background.service_worker, new this.sources.RawSource(newWorkerString));
            return manifest;
        }
        if ("scripts" in manifest.background) {
            // Insert Script
            manifest.background.scripts.push(this.backgroundPagePathDefault);
            return manifest;
        }
        // Insert Script
        manifest.background = { scripts: [this.backgroundPagePathDefault] };
        return manifest;
    }
}
exports.default = WebextensionPlugin;
