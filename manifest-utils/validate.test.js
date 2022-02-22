/* eslint-env jest */
const validateManifest = require('./validate')
const chalk = require('chalk')
let colorSupportBackup

beforeEach(() => {
  colorSupportBackup = chalk.enabled
  chalk.enabled = false
})

afterEach(() => {
  chalk.enabled = colorSupportBackup
})

test('manifest validation failed when manifest is an empty object', async () => {
  const manifest = {}
  // Name is required
  expect(
    validateManifest(manifest)
  ).rejects.toThrowErrorMatchingSnapshot()
})

test('validate manifest v2', async () => {
  // Arrange
  const manifest = {
    "manifest_version": 2,
    "name": "__MSG_extensionName__",
    "description": "__MSG_extensionDescription__",
    "version": "0.0.1",
    "minimum_chrome_version": "88",
    "default_locale": "en",
    "icons": {
      "48": "icons/bookmark-it.png",
      "96": "icons/bookmark-it@2x.png"
    },
    "permissions": [
      "bookmarks",
      "tabs",
      "<all_urls>"
    ],
    "browser_action": {
      "default_icon": "icons/star-empty-38.png",
      "default_title": "Bookmark it!"
    },
    "background": {
      "scripts": ["background.js"]
    },
    "content_security_policy": "...",
    "web_accessible_resources": [
      'path1', 'path2'
    ]
  }
  let error = null

  // Act
  try {
    await validateManifest(manifest)
  }catch(e) {
    error = e
  }
  
  
  // Assert
  expect(error).toEqual(null)
})

test('validate manifest v3', async () => {
  // Arrange
  const manifest = {
    "manifest_version": 3,
    "name": "__MSG_extensionName__",
    "description": "__MSG_extensionDescription__",
    "version": "0.0.1",
    "minimum_chrome_version": "88",
    "default_locale": "en",
    "icons": {
      "48": "icons/bookmark-it.png",
      "96": "icons/bookmark-it@2x.png"
    },
    "permissions": [
      "bookmarks",
      "tabs"
    ],
    "action": {
      "default_icon": "icons/star-empty-38.png",
      "default_title": "Bookmark it!"
    },
    "background": {
      "service_worker": "background.js"
    },
    "host_permissions": [
      "<all_urls>"
    ],
    "content_security_policy": {
      "extension_pages": "...",
      "sandbox": "..."
    },
    "web_accessible_resources": [{
      "resources": ['path1', 'path2'],
      "matches": ['pattern1'],
      "extension_ids": ['ext_id1'],
      "use_dynamic_url": true
    }]
  }
  let error = null

  // Act
  try {
    await validateManifest(manifest)
  }catch(e) {
    error = e
  }
  
  // Assert
  expect(error).toEqual(null)
})
