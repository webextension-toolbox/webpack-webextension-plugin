/* eslint-env jest */
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const tmp = require('tmp-promise')
const addBackgroundscript = require('./add-backgroundscript')

test('adds a new background backgroundscript', async () => {
  const manifest = {
    name: 'left-pad'
  }
  const result = await addBackgroundscript(manifest, 'auto-reload.js')
  expect(result).toEqual({
    manifest: {
      name: 'left-pad',
      background: {
        scripts: [
          'auto-reload.js'
        ]
      }
    }
  })
})

test('extends background entry with backgroundscript', async () => {
  const manifest = {
    name: 'left-pad',
    background: {
      scripts: [
        'background.js'
      ]
    }
  }
  const result = await addBackgroundscript(manifest, 'auto-reload.js')
  expect(result).toEqual({
    manifest: {
      name: 'left-pad',
      background: {
        scripts: [
          'auto-reload.js',
          'background.js'
        ]
      }
    }
  })
})

test('adds backgroundscript to background page and doesnt change manifest', async () => {
  const backgroundPageFile = await tmp.file()
  const backgroundPagePath = path.basename(backgroundPageFile.path)
  await promisify(fs.writeFile)(backgroundPageFile.fd, `<!DOCTYPE html><html><body>
content
</body></html>`, { encoding: 'utf8' })
  const manifest = {
    name: 'left-pad',
    background: {
      page: backgroundPagePath
    }
  }
  const result = await addBackgroundscript(manifest, 'auto-reload.js', path.dirname(backgroundPageFile.path))
  backgroundPageFile.cleanup()
  expect(result).toEqual({
    manifest: {
      name: 'left-pad',
      background: {
        page: backgroundPagePath
      }
    },
    backgroundPagePath,
    backgroundPageStr: `<!DOCTYPE html><html><body>
content
<script src="auto-reload.js"></script>
</body></html>`
  })
})

test('errors when both backgroundscript and background page are present in manifest', () => {
  const manifest = {
    name: 'left-pad',
    background: {
      scripts: [
        'background.js'
      ],
      page: 'background.html'
    }
  }
  return expect(addBackgroundscript(manifest, 'auto-reload.js')).rejects.toThrow()
})
