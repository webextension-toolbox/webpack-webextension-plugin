# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.3.1] - 2024-01-07

### Changed

- Added non default export for esm imports

### Changed

- Updated Readme

## [3.2.1] - 2023-10-28

### Changed

- Updated Readme

## [3.2.0] - 2023-10-28

### Changed

- Updated Dependencies

## [3.1.0] - 2023-06-13

### Changed

- Updated Dependencies

## [3.0.0] - 2023-03-13

### Fixed

- Fixes #357 Schema for manifest validation is out of date

### Changed

- Updated Dependencies
- References both Mozilla and Chrome manifest schemas during validation

### Removed

- Support for NodeJS 12.x

### Added

- Added tests for the manifest validations and transformations

## [2.1.3] - 2022-06-03

### Fixed

- Fixes #204 Hardcoded service_worker file breaks when using custom service_worker (Thanks @j1mie)

## [2.1.2] - 2022-04-19

### Fixed

- Fixes #167 Localized strings are now being removed from manifest.json (Thanks @rthaut)

## [2.1.1] - 2022-04-14

### Fixed

- Fixed issues with nodejs 12 and promises

## [2.1.0] - 2022-04-14

### Added

- Official Support for hooks in service worker to reload extension during development

## [2.0.4] - 2022-04-11

### Fixed

- Client background_page no longer relies on pollyfill and thus must detect browser/chrome for options

## [2.0.3] - 2022-04-06

### Changed

- Fix repo url in package.json for GPR

## [2.0.2] - 2022-04-06

### Changed

- Package is now scoped and as such is now listed on GPR.

## [2.0.1] - 2022-04-06

### Changed

- Publish fixes for github

## [2.0.0] - 2022-04-05

### Added

- Typescript support
- Service Worker client support
- Support \_\_ENV\_\_ variable replacement in manifest

### Changed

- Please note package changed from `webpack-webextension-plugin` to `@webextension-toolbox/webpack-webextension-plugin`
- Remove JOI and export types for manifest validation utilizing JSON Schema
- Send error from Manifest Validator to webpack instead of throwing an exception
- Stop using Standard and implement ESLint and Prettier instead
- Split client scripts and plugin scripts into two separate typescript projects

## [1.0.0] - 2022-02-22

### Added

- Bypass Manifest validation for inital Manifest v3 support (#161) [@here-nerd]

### Fixed

- Fix detection of changed files (#143) [@desonov]

### Changed

- Inline with Semantic Versioning this is no longer in initial development and thus the version should reflect that (Major version is now 1)

## [0.4.1] - 2021-07-04

### Changed

- Merge pull request #115 from webextension-toolbox/dependabot/npm_and_yarn/jest-27.0.6 604d85a
- Bump jest from 27.0.5 to 27.0.6 189af4a
- Merge pull request #114 from webextension-toolbox/dependabot/npm_and_yarn/ws-7.5.1 41a0cbb
- Merge pull request #116 from rthaut/master 546c070
- Remove extra semicolon 831e112
- fix typo causing problem when storing previous file system info after extracting changed files eb28e81
- WebPack 5 support 5817383
- Bump ws from 7.5.0 to 7.5.1 278f6e9

## [0.3.0] - 2020-11-17

### Changed

- Move asset icon 1c221b6
- Create npm-publish.yml 02e27c2
- Remove some badges 1757a9b
- Merge pull request #81 from balcsida/update_dependencies 2e0bff4
- Stip ANSI characters chalk.reset no longer works 481b608
- Set minimum node engine requirement to 12 de84124
- Remove old CI/CD stuff eca1b82
- Fix manifest validation fff16de
- Fix Standard errors 2b37247
- Update dependencies b36309f
- Merge pull request #80 from balcsida/ghactions 72ce064
- Add lockfiles as CI uses them 8d1a735
- Create node.js.yml 9effc94
- Merge branch &#39;ghactions&#39; of https://github.com/balcsida/webpack-webextension-plugin into ghactions c89bc3b
- Remove travis and appveyor configuration d6ab63a
- Remove travis and appveyor configuration f0664b9
- Merge pull request #36 from ermik/fix-reload-regex bfe0ba9
- always return an array from getManifestFileDeps 3d70eb5
- build fileRegex object only once per init 51e7988
- Rename .renovate.json to renovate.json ea713a3

## [0.2.0] - 2019-05-04

### Changed

- Add azure-pipelines.yml to .npmignore f9a16b1
- Set up CI with Azure Pipelines (#20) 67b92d4
- Replace Build Status badge 65b9b76
- Remove Appveyor and old Travis and update README.md (#21) ad8ee54
- Remove travis.yml 5c13e44
- Set up CI with Azure Pipelines 8875d45
- .npmignore updates 1447134
- Update dependency standard to v12 (#10) ae982d5
- Update dependency ws to v7 (#18) 3792561
- Minor branding touches in README.md c14c414
- Remove Appveyor 3a04b78
- Update dependency ws to v7 ed7471f
- Update dependency standard to v12 e6aac6b
- Update dependency jest to v24 (#13) 4d72742
- Change joi to @hapi/joi (also upgrade it to latest version) (#19) 6b174ce
- Change joi to @hapi/joi (also upgrade it to latest version) 0ea06c3
- Update dependency jest to v24 8877ec2
- Merge pull request #7 from balcsida/master c12baea
- Rebranding 4978506
- [skip ci] Remove Greenkeeper badge 889daea
- [skip ci] Appveyor - test only one arch 1888789
- [skip ci] Create .npmignore c18ca87
- Merge pull request #5 from webextension-toolbox/renovate/configure 7b37f18
- [skip ci] Update renovate.json efc1ba0
- Add renovate.json 3900b94
- Update links (again) 70b9627
- Merge branch 'master' of https://github.com/webextension-tools/webpack-webextension-plugin 5aadfdc
- Test on 64 bit Windows c858c37
- Add AppVeyor badge 50c135e
- Initial AppVeyor config b1bd178
- Merge pull request #4 from webextension-tools/greenkeeper/initial ec5be7c
- docs(readme): add Greenkeeper badge 2b043f1
- Add devDependencies badge 3c0ef96
- Replace bitHound with David-DM 627e244
- Update badge links to organization d48fdfd

## [0.1.1] - 2018-06-04

## [0.1.0] - 2018-06-01

## [0.0.4] - 2018-05-28

## [0.0.3] - 2018-04-09

## [0.0.3-0] - 2018-04-04

## [0.0.2] - 2018-03-30
