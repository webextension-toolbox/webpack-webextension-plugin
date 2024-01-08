import path from "path";
import { promisify } from "util";
import WebSocket from "ws";
import webpack, { Compiler, Compilation, Stats } from "webpack";
import Mustache from "mustache";
import { constants, readFileSync } from "fs";
import { access } from "fs/promises";
import vendors from "./vendors.json";
import {
  Manifest,
  validateManifest,
  transformManifestValuesFromENV,
  transformManifestVendorKeys,
} from "./manifest";

const { WebpackError } = webpack;

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

class WebextensionPlugin {
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

  // eslint-disable-next-line no-unused-vars
  notifyExtension: (data: Notification) => void;

  client: any;

  vendors: string[];

  backgroundPagePathDefault: string;

  manifestNameDefault: string;

  constructor({
    port = 35729,
    host = "localhost",
    reconnectTime = 3000,
    autoreload = true,
    vendor = "chrome",
    manifestDefaults = {},
    quiet = false,
    skipManifestValidation = false,
  }: WebextensionPluginOptions = {}) {
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

    this.vendors = vendors;

    this.backgroundPagePathDefault = "webextension-toolbox/background_page.js";
    this.manifestNameDefault = "manifest.json";

    this.notifyExtension = () => {};
  }

  /**
   * Install plugin (install hooks)
   *
   * @param compiler Compiler
   */
  apply(compiler: Compiler) {
    const { name } = this.constructor;
    const { inputFileSystem } = compiler;
    this.readFile = promisify(inputFileSystem.readFile.bind(inputFileSystem));
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
  watchRun(compiler: Compiler) {
    this.isWatching = true;
    this.detectManifestModification(compiler);
    return this.startServer();
  }

  /**
   * Webpack compilation hook
   *
   * @param {Object} compilation
   */
  compilation(compilation: Compilation) {
    this.injectServiceWorkerClient(compilation);
    this.keepFiles(compilation);
  }

  /**
   * Inject Service Worker Client into the current server_worker
   * @param compilation
   */
  injectServiceWorkerClient(compilation: Compilation) {
    // Locate the service worker
    const manifestPath = path.join(
      compilation.options.context ?? "",
      this.manifestNameDefault
    );
    const manifestBuffer = readFileSync(manifestPath, {
      encoding: "utf8",
    });
    const manifest = JSON.parse(manifestBuffer);
    const serviceWorker = manifest?.background?.service_worker ?? null;

    if (
      serviceWorker !== null &&
      this.autoreload &&
      this.isWatching &&
      !this.clientAdded
    ) {
      const { name } = this.constructor;
      compilation.hooks.processAssets.tap(
        {
          name,
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          if (assets[serviceWorker]) {
            const source = readFileSync(
              path.resolve(__dirname, "service_worker.js"),
              {
                encoding: "utf8",
              }
            );

            const replacedSource = Mustache.render(source.toString(), {
              port: this.port,
              host: this.host,
              reconnectTime: this.reconnectTime,
            });

            compilation.updateAsset(
              serviceWorker,
              (old) =>
                new this.sources.RawSource(`${replacedSource}\n${old.source()}`)
            );
          }
        }
      );
    }
  }

  /**
   * Webpack make hook
   *
   * @param compilation Compilation
   */
  make(compilation: Compilation) {
    return Promise.all([this.addManifest(compilation)]).then(() => {});
  }

  /**
   * Webpack afteCompile hook
   *
   * @param compilation Compilation
   */
  afterCompile(compilation: Compilation) {
    return this.watchManifest(compilation);
  }

  /**
   * Add manifest to the filesDependencies
   *
   * @param compilation Compilation
   */
  watchManifest(compilation: Compilation) {
    if (!compilation.options.context) {
      return;
    }
    compilation.fileDependencies.add(
      path.join(compilation.options.context, this.manifestNameDefault)
    );
  }

  /**
   * Webpack done hook
   *
   * @param stats Stats
   */
  done(stats: Stats) {
    this.reloadExtensions(stats);
  }

  /**
   * Prevents deletion of manifest.json and background_page.js files by clean plugin
   *
   * @param compilation Compilation
   */
  keepFiles(compilation: Compilation) {
    if (this.cleanPlugin) {
      this.cleanPlugin
        .getCompilationHooks(compilation)
        .keep.tap(
          this.constructor.name,
          (asset: string) =>
            asset === this.manifestNameDefault ||
            (asset === this.backgroundPagePathDefault &&
              this.autoreload &&
              this.isWatching)
        );
    }
  }

  /**
   * Detect changed files
   *
   * @param compiler Compiler
   */
  detectManifestModification(compiler: Compiler) {
    if (compiler.modifiedFiles && compiler.options.context) {
      const manifestFile = path.join(
        compiler.options.context,
        this.manifestNameDefault
      );
      this.manifestChanged = compiler.modifiedFiles.has(manifestFile);
    }
  }

  /**
   * Start websocket server
   * on watch mode
   */
  startServer() {
    return new Promise<void>((resolve, reject) => {
      if (!this.autoreload || !this.isWatching || this.server) {
        resolve();
        return;
      }
      const { host, port } = this;
      this.server = new WebSocket.Server({ port }, () => {
        this.log(`listens on ws://${host}:${port}`);
        resolve();
      });
      this.server.on("error", reject);
      this.notifyExtension = (data: Notification) => {
        this.server.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      };
    });
  }

  /**
   * Namespaced logger
   */
  log(...optionalParams: any[]) {
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
  async addClient(compilation: Compilation) {
    if (this.autoreload && this.isWatching && !this.clientAdded) {
      // Add client to extension. We will includes this
      // as a background script in the manifest.json later.
      const client = await this.compileClient();
      compilation.emitAsset(
        this.backgroundPagePathDefault,
        new this.sources.RawSource(client)
      );
      this.clientAdded = true;
    }
  }

  /**
   * Compile the client only once
   * and add it to the assets output
   */
  async compileClient() {
    // Only compile client once
    if (this.client) return this.client;

    // Get the client as string
    const clientPath = path.resolve(__dirname, "background_page.js");
    const clientBuffer = await this.readFile(clientPath);

    // Inject settings
    this.client = Mustache.render(clientBuffer.toString(), {
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
  async addManifest(compilation: Compilation) {
    if (this.manifestChanged) {
      if (!compilation.options.context) {
        return;
      }

      // Load manifest
      const manifestPath = path.join(
        compilation.options.context,
        this.manifestNameDefault
      );
      const manifestBuffer = await this.readFile(manifestPath);
      let manifest: Manifest;
      // Convert to JSON
      try {
        manifest = JSON.parse(manifestBuffer);
      } catch (error) {
        throw new Error(`Could not parse ${this.manifestNameDefault}`);
      }

      manifest = {
        ...this.manifestDefaults,
        ...manifest,
      };

      // Transform __chrome__key -> key
      manifest = transformManifestVendorKeys(manifest, this.vendor);

      // Transform ENV Values
      manifest = transformManifestValuesFromENV(manifest);

      // Validate manifest.json syntax
      if (!this.skipManifestValidation) {
        const errors = validateManifest(manifest);
        if (errors !== null) {
          errors.forEach((error) => {
            const webpackError = new WebpackError(
              `${error.dataPath} ${error.message}`
            );
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
      compilation.emitAsset(
        this.manifestNameDefault,
        new this.sources.RawSource(manifestStr)
      );
    }
  }

  /**
   * Send message to extensions with
   * changed files
   *
   * @param stats Stats
   */
  reloadExtensions(stats: Stats) {
    // Skip in normal mode
    if (!this.server || !this.isWatching) return;

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
  extractChangedFiles({ emittedAssets }: Compilation) {
    return emittedAssets ? Array.from(emittedAssets) : [];
  }

  /**
   * Add Background Script to reload extension in dev mode
   *
   * @param manifest Manifest
   * @param compilation Compilation
   * @returns Promise<Manifest>
   */
  async addBackgroundscript(
    manifest: Manifest,
    compilation: Compilation
  ): Promise<Manifest> {
    if (!manifest.background) {
      manifest.background = undefined;
      return manifest;
    }

    this.compileClient();

    if ("service_worker" in manifest.background) {
      const { context } = compilation.options;
      if (!context) {
        // TODO: log this as an error
        return manifest;
      }
      return manifest;
    }

    this.addClient(compilation);

    if ("page" in manifest.background && manifest.background.page) {
      const { context } = compilation.options;
      if (!context) {
        // TODO: log this as an error
        return manifest;
      }
      // Insert Page
      const pagePath = path.join(context, manifest.background.page);
      const pageString = await this.readFile(pagePath, { encoding: "utf8" });

      const bodyEnd = pageString.search(/\s*<\/body>/);
      const backgroundPageStr = `${pageString.substring(
        0,
        bodyEnd
      )}\n<script src="${
        this.backgroundPagePathDefault
      }"></script>${pageString.substring(bodyEnd)}`;
      compilation.emitAsset(
        manifest.background.page,
        new this.sources.RawSource(backgroundPageStr)
      );

      return manifest;
    }

    if ("scripts" in manifest.background && manifest.background.scripts) {
      // Insert Script
      manifest.background.scripts.push(this.backgroundPagePathDefault);
      return manifest;
    }

    // Insert Script
    manifest.background = { scripts: [this.backgroundPagePathDefault] };
    return manifest;
  }

  /**
   * Check if file exists
   * @param file
   * @returns Promise<boolean>
   */
  async fileExists(file: string): Promise<boolean> {
    try {
      await access(file, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the true filename (used for Typescript detections)
   * @param context
   * @param relative
   * @returns Promise<string>
   */
  async getTrueFilename(context: string, relative: string): Promise<string> {
    const { name, dir } = path.parse(relative);
    if (await this.fileExists(path.join(context, dir, `${name}.js`))) {
      return path.join(dir, `${name}.js`);
    }
    if (await this.fileExists(path.join(context, dir, `${name}.ts`))) {
      return path.join(dir, `${name}.ts`);
    }
    return path.join(dir, `${name}.js`);
  }
}

export { WebextensionPlugin };
export default WebextensionPlugin;
