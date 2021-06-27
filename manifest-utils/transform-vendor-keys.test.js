/* eslint-env jest */
const transformVendorKeys = require('./transform-vendor-keys')

test('does not change manifest if no vendor is given', () => {
  const manifest = {
    version: '42.0.0',
    name: 'left-pad'
  }
  const result = transformVendorKeys(manifest)
  expect(result).toEqual(manifest)
})

test('transform correct vendor keys', () => {
  const manifest = {
    version: '42.0.0',
    name: 'left-pad',
    __chrome__name: 'chrome-pad'
  }
  const result = transformVendorKeys(manifest, 'chrome')
  expect(result.name).toEqual(manifest.__chrome__name)
})

test('removes unused vendor keys', () => {
  const manifest = {
    version: '42.0.0',
    __chrome__key: 'chrome-pad'
  }
  const result = transformVendorKeys(manifest, 'firefox')
  expect(result.key).toBeUndefined()
})

test('transforms nested keys', () => {
  const manifest = {
    browser_action: {
      __firefox__theme_icons: true
    }
  }
  const result = transformVendorKeys(manifest, 'firefox')
  expect(result.browser_action.theme_icons).toBeTruthy()
})

test('removes unused nested vendor keys', () => {
  const manifest = {
    browser_action: {
      __firefox__theme_icons: true
    }
  }
  const result = transformVendorKeys(manifest, 'chrome')
  expect(result.browser_action.theme_icons).toBeUndefined()
})

test('transform safari keys correctly', () => {
  const manifest = {
    version: '42.0.0',
    name: 'left-pad',
    __safari__name: 'safari-pad'
  }
  const result = transformVendorKeys(manifest, 'safari')
  expect(result.name).toEqual(manifest.__safari__name)
})

test('transform combined keys correctly', () => {
  const manifest = {
    version: '42.0.0',
    name: 'left-pad',
    '__safari|opera__name': 'pad'
  }
  const resultSafari = transformVendorKeys(manifest, 'safari')
  const resultOpera = transformVendorKeys(manifest, 'opera')
  expect(resultSafari.name).toEqual(manifest['__safari|opera__name'])
  expect(resultOpera.name).toEqual(manifest['__safari|opera__name'])
})
