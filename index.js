const path = require('path')
const { promisify } = require('util')
const IO = require('socket.io')
const WebpackFileEntry = require('./utils/webpack-file-entry')
const manifestUtils = require('./manifest-utils')
const vendors = require('./vendors.json')
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin')
const EnvironmentPlugin = require('webpack/lib/EnvironmentPlugin')

class WebextensionPlugin {
  constructor ({
    port = 35729,
    autoreload = true,
    vendor = 'chrome',
    manifestDefaults = {},
    quiet = false
  } = {}) {
    // Apply Settings
    this.port = port
    this.autoreload = autoreload
    this.vendor = vendor
    this.manifestDefaults = manifestDefaults
    this.quiet = quiet

    // Set some defaults
    this.server = null
    this.isWatching = false
    this.startTime = Date.now()
    this.prevFileTimestamps = new Map()
  }

  /**
   * Install plugin (install hooks)
   *
   * @param {Object} compiler
   */
  apply (compiler) {
    const { name } = this.constructor
    compiler.hooks.watchRun.tap(name, this.watchRun.bind(this))
    compiler.hooks.emit.tapPromise(name, this.emit.bind(this))
    compiler.hooks.afterCompile.tap(name, this.afterCompile.bind(this))
    compiler.hooks.done.tap(name, this.done.bind(this))
  }

  /**
   * Webpack watchRun hook
   *
   * @param {Boolean} watching
   */
  watchRun (compiler) {
    this.isWatching = true

    if (this.autoreload) {
      // Add client
      this.addClient(compiler)

      // Start node server
      this.startServer(compiler)
    }
  }

  /**
   * Add the client to the entry object
   *
   * @param {Object} compiler
   */
  addClient (compiler) {
    // Add reload client
    new SingleEntryPlugin(
      this.constructor.name,
      require.resolve('./client'),
      'webextension-toolbox/client'
    ).apply(compiler)

    // Configure client via process.env
    new EnvironmentPlugin({
      WEBEXTENSION_TOOLBOX_PORT: this.port,
      WEBEXTENSION_TOOLBOX_QUIET: this.quiet
    }).apply(compiler)
  }

  /**
   * Webpack emit hook
   *
   * @param {Object} compilation
   */
  emit (compilation) {
    const { inputFileSystem } = compilation
    this.readFile = promisify(inputFileSystem.readFile.bind(inputFileSystem))
    return Promise.all([
      this.addManifest(compilation)
    ])
  }

  /**
   * Webpack afteCompile hook
   *
   * @param {Object} compilation
   */
  afterCompile (compilation) {
    return this.watchManifest(compilation)
  }

  /**
   * Add manifest to the filesDependencies
   *
   * @param {Object} compilation
   */
  watchManifest (compilation) {
    compilation.fileDependencies.add(
      path.join(compilation.options.context, 'manifest.json')
    )
  }

  /**
   * Webpack done hook
   *
   * @param {Object} stats
   */
  done (stats) {
    this.reloadExtensions(stats)
  }

  /**
   * Start websocket server
   * on watch mode
   */
  startServer () {
    if (!this.server) {
      this.server = IO(this.port)
      this.server.on('connection', socket => {
        console.log('connection')
        this.socket = socket
      })
    }
  }

  /**
   * Namespaced logger
   *
   * @param {*} args
   */
  log (...args) {
    if (!this.quiet) {
      console.log('webpack-webextension-plugin', ...args)
    }
  }

  /**
   * Compile manifest and add it
   * to the asset ouput
   *
   * @param {Object} compilation
   */
  async addManifest (compilation) {
    // Load manifest
    const manifestPath = path.join(compilation.options.context, 'manifest.json')
    const manifestBuffer = await this.readFile(manifestPath)

    // Convert to JSON
    try {
      var manifest = JSON.parse(manifestBuffer)
    } catch (error) {
      throw new Error('Could not parse manifest.json')
    }

    manifest = {
      ...this.manifestDefaults,
      ...manifest
    }

    // Tranform __chrome__key -> key
    manifest = manifestUtils.transformVendorKeys(manifest)

    // Validate
    await manifestUtils.validate(manifest)

    // Add client
    if (this.autoreload && this.isWatching) {
      manifest = manifestUtils.addBackgroundscript(manifest, 'webextension-toolbox/client.js')
    }

    // Create webpack file entry
    const manifestStr = JSON.stringify(manifest, null, 2)
    compilation.assets['manifest.json'] = new WebpackFileEntry(manifestStr)
  }

  /**
   * Send message to extensions with
   * changed files
   *
   * @param {Object} stats
   */
  reloadExtensions (stats) {
    // Skip in normal mode
    if (!this.autoreload || !this.server || !this.isWatching) return

    // Get changed files since last compile
    const changedFiles = this.extractChangedFiles(stats.compilation)
    if (changedFiles.length) {
      this.log('reloading extension...')
      this.socket.broadcast.emit('reload', changedFiles)
    }
  }

  /**
   * Get the changed files since
   * last compilation
   *
   * @param {Object} compilation
   */
  extractChangedFiles ({ fileTimestamps, options }) {
    const changedFiles = new Map()

    // Compare file timestamps with last compilation
    for (const [watchfile, timestamp] of fileTimestamps.entries()) {
      const isFile = Boolean(path.extname(watchfile))
      if (isFile && (this.prevFileTimestamps.get(watchfile) || this.startTime) < (fileTimestamps.get(watchfile) || Infinity)) {
        changedFiles.set(watchfile, timestamp)
      }
    }
    this.prevFileTimestamps = fileTimestamps

    // Remove context path
    const contextRegex = new RegExp('^' + options.context.replace('/', '\\/') + '\\/')
    return Array
      .from(changedFiles.keys())
      .map(filePath => filePath.replace(contextRegex, ''))
  }
}

// Expose the vendors
WebextensionPlugin.vendors = vendors

module.exports = WebextensionPlugin
