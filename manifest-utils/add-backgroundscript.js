const path = require('path')
const readFile = require('util').promisify(require('fs').readFile)

module.exports = async function addBackgroundscript (manifest, scriptPath, context) {
  if (!manifest.background) {
    manifest.background = {}
  }

  if (manifest.background.page && manifest.background.scripts) {
    throw new Error('Found background page as well as scripts in manifest, only 1 may be present')
  } else if (manifest.background.page) {
    const pagePath = path.join(context, manifest.background.page)
    const pageString = await readFile(pagePath, { encoding: 'utf8' })

    const bodyEnd = pageString.search(/\s*<\/body>/)
    const backgroundPageStr = pageString.substring(0, bodyEnd) + '\n<script src="' + scriptPath + '"></script>' + pageString.substring(bodyEnd)

    return { manifest, backgroundPagePath: manifest.background.page, backgroundPageStr }
  } else {
    if (!manifest.background.scripts) {
      manifest.background.scripts = []
    }

    manifest.background.scripts = [
      scriptPath,
      ...manifest.background.scripts
    ]
    return { manifest }
  }
}
