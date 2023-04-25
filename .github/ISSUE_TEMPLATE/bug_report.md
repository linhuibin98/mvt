---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: ''

---

## Describe the bug

A clear and concise description of what the bug is.

## System Info

- **required** `mvt` version:
- **required** Operating System:
- **required** Node version:
- Optional:
  - npm/yarn version
  - Installed `vue` version (from `yarn.lock` or `package-lock.json`)
  - Installed `@vue/compiler-sfc` version

## Logs

1.  **run `mvt` or `mvt build` with the `DEBUG` environment variable set to `mvt:*`** - e.g. modify the `dev` script in your `package.json` to:

    ``` bash
    DEBUG=mvt:* mvt
    ```

    On windows, you will need [cross-env](https://www.npmjs.com/package/cross-env):

    ``` bash
    cross-env DEBUG=mvt:* mvt
    ```

2. Provide the error log here.

## Reproduction

Provide a link to a reproduction repo if applicable.