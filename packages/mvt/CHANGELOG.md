## [0.10.3](https://github.com/linhuibin98/unbundle/compare/v0.10.2...v0.10.3) (2023-04-24)


### Bug Fixes

* fix module entry redirect on Windows ([f9ed846](https://github.com/linhuibin98/unbundle/commit/f9ed84648abd2ff9c4a5437a660d924132741dfd))
* only log target exist when error says so ([a13c29f](https://github.com/linhuibin98/unbundle/commit/a13c29ff49ab4e07ebcd5413036472a3db72df25))


### Features

* add asset options into build options ([a457f5e](https://github.com/linhuibin98/unbundle/commit/a457f5e3e539d4b257f8af0be0f0ebb88f339044))
* public base path support ([91f1d8c](https://github.com/linhuibin98/unbundle/commit/91f1d8c416ae8bc8dfae576c0c29f29aa6fc23bb))
* support ssrBuild ([4c252b4](https://github.com/linhuibin98/unbundle/commit/4c252b4b864ecacd1bce982375300b40f9589a18))



## [0.10.2](https://github.com/linhuibin98/unbundle/compare/v0.10.1...v0.10.2) (2023-04-23)


### Bug Fixes

* fix build index asset injection ([766f5fc](https://github.com/linhuibin98/unbundle/commit/766f5fcb8a0f216069aa7a98d37b2aba5efd25a8))
* **moduleResolve:** do not rewrite external imports ([b0c5eff](https://github.com/linhuibin98/unbundle/commit/b0c5effc58817c61f5d6ace2388f7348bcaf81cd))
* properly handle absolute asset urls ([9d7b414](https://github.com/linhuibin98/unbundle/commit/9d7b414c978c81e46ba46c36fb6e2fc8c2bd362e))


### Features

* support CSS modules for *.module.css ([23cab58](https://github.com/linhuibin98/unbundle/commit/23cab58580a3f16533b82f0f2d8133f6b61e5bdf))



## [0.10.1](https://github.com/linhuibin98/unbundle/compare/v0.10.0...v0.10.1) (2023-04-23)


### Bug Fixes

* crash when importing component with no script tag ([b1e808b](https://github.com/linhuibin98/unbundle/commit/b1e808b2cb0d6752002e35efff695040f8fc9612))
* should not write assets when buildOptions.write is false ([bca12e3](https://github.com/linhuibin98/unbundle/commit/bca12e3134f19ce053b2d152898f8b287b9ff07b))



# [0.10.0](https://github.com/linhuibin98/unbundle/compare/v0.9.1...v0.10.0) (2023-04-21)


### Bug Fixes

* fix isImportRequest check on request with queies ([50a23d7](https://github.com/linhuibin98/unbundle/commit/50a23d79dc660345df497fc13cbea4929158672d))


### Features

* load custom postcss config ([dccf9e8](https://github.com/linhuibin98/unbundle/commit/dccf9e8c00481142b8f8392d87a4fd753ce4ffbd))
* support json hmr ([13d54c1](https://github.com/linhuibin98/unbundle/commit/13d54c1a6ee9dba986807d51513903802b24904d))
* support postcss config in js css imports as well ([4e5d017](https://github.com/linhuibin98/unbundle/commit/4e5d017327b805c2e3e2115a369e0c41b8a666aa))
* support postcss in build ([664b7d0](https://github.com/linhuibin98/unbundle/commit/664b7d08a5e5b2ff148572a8ebadabc841671abd))
* vue source map ([27ec848](https://github.com/linhuibin98/unbundle/commit/27ec8489bc6041ddb971223a4b50bc333ce691cb))


### Performance Improvements

* lazy load postcss-load-config ([6d22a6d](https://github.com/linhuibin98/unbundle/commit/6d22a6d70a85c2dd83175b348461b1d5c6439b64))



## [0.9.1](https://github.com/linhuibin98/unbundle/compare/v0.9.0...v0.9.1) (2023-04-19)


### Bug Fixes

* readBody can return null ([fdc1409](https://github.com/linhuibin98/unbundle/commit/fdc1409457dd923172358557cdc9a83e25ea8c49))



