const io = require('socket.io-client')
const port = process.env.WEBEXTENSION_TOOLBOX_PORT || 35729
const quiet = process.env.WEBEXTENSION_TOOLBOX_QUIET || false
const socket = io(`http://127.0.0.1:${port}`)

/**
 * We don't like reopening our devtools after a browser.runtime.reload.
 * Since it is not possible to open them programatically, we
 * need to reduce the runtime.reloads.
 * This function prefers softer reloads, by comparing
 * runtime depenencies with the changed files.
 *
 * @param {Array} changedFiles
 */
function smartReloadExtension (changedFiles) {
  const { browser, chrome } = window

  log('Reloading ...')

  // Full reload if we have no changed files (dump reload!)
  if (!changedFiles) {
    (browser || chrome).runtime.reload()
  }

  // Full reload manifest changed
  if (changedFiles.some(file => file === 'manifest.json')) {
    smartReloadExtension()
  }

  // Full reload if _locales changed
  if (changedFiles.some(file => /^_locales\//.test(file))) {
    smartReloadExtension()
  }

  // Full reload if manifest deps changed
  if (getManifestFileDeps().some(file => changedFiles.includes(file))) {
    smartReloadExtension()
  }

  // Reload current tab (smart reload)
  (browser || chrome).tabs.reload();

  // Reload other extension views
  (browser || chrome).extension
    .getViews()
    .map(_window => _window.location.reload())
}

/**
 * Return all files depenencies listed
 * in the manifest.json.
 */
function getManifestFileDeps () {
  const { browser, chrome } = window

  const manifest = (browser || chrome).runtime.getManifest()
  const manifestStr = JSON.stringify(manifest)
  const fileRegex = /[^"]*\.[a-zA-Z]+/g
  return manifestStr.match(fileRegex)
}

/**
 * Simple namespaced logger
 *
 * @param {*} message
 * @param {*} args
 */
function log (message, ...args) {
  if (!quiet) {
    console.log(`%cwebpack-webextension-plugin: ${message}`, 'color: gray;', ...args)
  }
}

socket.on('reload', smartReloadExtension)
