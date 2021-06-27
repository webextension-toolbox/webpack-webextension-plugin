[<img align="right" src="./.github/assets/icon.svg?sanitize=true">](https://www.npmjs.com/package/webpack-webextension-plugin)
# Webpack WebExtension Plugin

[![npm package](https://badge.fury.io/js/webpack-webextension-plugin.svg)](https://www.npmjs.com/package/webpack-webextension-plugin)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![license](https://img.shields.io/npm/l/webpack-webextension-plugin.svg)](https://github.com/webextension-toolbox/webpack-webextension-plugin/blob/master/LICENSE)

Webpack plugin that compiles web-extension `manifest.json` files and adds smart auto reload.

## What does it do?

* Autoreload extensions via websockets
* Use vendor prefixes in manifest properties
* Validates some `manifest.json` fields

## Install

```bash
$ npm i webpack-webextension-plugin
```

## Usage

```js
const WebextensionPlugin = require('webpack-webextension-plugin')

const config = {
  plugins: [
    new WebextensionPlugin({
      vendor: 'chrome'
    })
  ]
}
```

### API

#### new WebextensionPlugin([options])

Add result to webpack plugins to initialize.

##### options

Type: `Object`

Any of the options below.

###### vendor

Type: `String`  
Default: `chrome`  
Any of: `chrome`, `opera`, `firefox`, `edge`, `safari`

Used for vendor prefixing in the `manifest.json`. More infos regarding this can be found below.

###### port

Type: `Integer`  
Default: `35729`

Specify the listening port for the webstocket development server.

###### autoreload

Type: `Boolean`  
Default: true

Enables auto reload. If not specified will be enabled when using webpacks watch mode.

###### quiet

Type: `Boolean`  
Default: false

Disable plugin logging.

###### reconnectTime

Type: `Integer`  
Default: `3000`

Specify the reconnect time to the development server from the extension side.

###### manifestDefaults

Type: `Object`  
Default: `{}`

Allows you to define defaults for the `manifest.json` file.

## FAQ

### How does smart autoreload work?

We create/extend a background page in the extension with a websockets client, that connects to our custom websocket server.
As soon as a specific files changes the client checks how to reload the extension:

* if `manifest.json` change → full reload
* if `manifest.json` dependencies change → full reload
* if `_locales` change → full reload
* else reload current tab & all extension views

### What are vendor prefixed manifest keys?

Vendor prefixed manifest keys allow you to write one `manifest.json` for multible vendors. 

```js
{
  "__chrome__name": "SuperChrome",
  "__firefox__name": "SuperFox",
  "__edge__name": "SuperEdge",
  "__opera__name": "SuperOpera",
  "__safari__name": "SuperSafari"
}
```

if the vendor is `chrome` this compiles to:

```js
{
  "name": "SuperChrome",
}
```

---

Add keys to multiple vendors by seperating them with | in the prefix

```
{
  __chrome|opera__name: "SuperBlink"
}
```

if the vendor is `chrome` or `opera`, this compiles to:

```
{
  "name": "SuperBlink"
}
```

### Why are you not using mozillas [web-ext](https://github.com/mozilla/web-ext) package?

* `webpack-webextension-plugin` should work for every browser in the same way.
* `web-ext` only works with Chrome and Firefox. You should definitely still check it out.

## Links

* [generator-web-extension](https://github.com/webextension-toolbox/generator-web-extension)
* [webextension-toolbox](https://github.com/webextension-toolbox/webextension-toolbox)

## License

Copyright 2018 Henrik Wenz

This project is free software released under the MIT license.
