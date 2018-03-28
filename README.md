# webpack-webextension-plugin

[![npm package](https://badge.fury.io/js/webpack-webextension-plugin.svg)](https://www.npmjs.com/package/webpack-webextension-plugin)
[![build status](https://travis-ci.org/HaNdTriX/webpack-webextension-plugin.svg?branch=master)](https://travis-ci.org/HaNdTriX/webpack-webextension-plugin) 
[![dependencies](https://img.shields.io/bithound/dependencies/github/rexxars/sse-channel.svg)](https://github.com/HaNdTriX/webpack-webextension-plugin)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![license](https://img.shields.io/npm/l/webpack-webextension-plugin.svg)](https://github.com/HaNdTriX/webpack-webextension-plugin/blob/master/LICENSE)

Webpack plugin that compiles web-extension `manifest.json` files and adds smart auto reload.

## What does it do?

* Autoreload extensions via websockets
* Use vendor prefixes in manifest properties

## Install

```bash
$ npm i webpack-webextension-plugin
```

## Usage

```js
const WebextensionPlugins = require('webpack-webextension-plugin')

...
plugins: [
  new WebextensionPlugins({
    vendor: 'chrome'
  })
]
...
```

## Supported Browser (vendor)

* `chrome`
* `opera`
* `firefox`
* `edge`

## FAQ

### How does smart autoreload work?

In watch mode, we create/extends a background page in the extension with a websockets client, that connects to our custom websocket server.
As soon as a specific files changes the client checks how to reload the extension:

* if `manifest.json` change → full reload
* if `manifest.json` dependencies change → full reload
* if `_locales` change → full reload
* else reload current tab & all extension views

### What are vendor prefixed manifest keys?

Vendor prefixed manifest keys allow you to write one `manifest.json` for multible vendors. 

`manifest.json`:

```js
{
  "__chrome__name": "SuperChrome",
  "__chrome__name": "SuperFox",
  "__chrome__name": "SuperEdge"
}
```

if the vendor is `chrome` this compiles to:

`manifest.json`:

```js
{
  "name": "SuperChrome",
}
```

### Why are you not using mozillas [web-ext](https://github.com/mozilla/web-ext) package?

* `webpack-webextension-plugin` should work for every browser in the same way.
* `web-ext` only works for firefox. Nevertheless if your primary browser is firefox, you should definetly check it out.

## License

Copyright 2018 Henrik Wenz

This project is free software released under the MIT license.
