<p align="center">
    :construction: Work in Progress! :construction:
</p>

<div align="center">
<img alt="Prettier" height="210"
  src="https://cdn.rawgit.com/prettier/prettier-logo/master/images/prettier-icon-light.svg">
<img alt="Swift" height="210px" vspace="" hspace="25"
  src="https://upload.wikimedia.org/wikipedia/commons/9/9d/Swift_logo.svg">
</div>

<h2 align="center">Swift Plugin for the Opinionated Code Formatter</h2>

<p align="center">
  <a href="https://gitter.im/jlongster/prettier">
    <img alt="Gitter" src="https://img.shields.io/gitter/room/jlongster/prettier.svg?style=flat-square">
  </a>
  <a href="https://travis-ci.org/prettier/plugin-swift">
    <img alt="Travis" src="https://img.shields.io/travis/prettier/plugin-swift/master.svg?style=flat-square">
  </a>
  <a href="https://www.npmjs.com/package/@prettier/plugin-swift">
    <img alt="npm version" src="https://img.shields.io/npm/v/@prettier/plugin-swift.svg?style=flat-square">
  </a>
  <!-- <a href="https://www.npmjs.com/package/@prettier/plugin-swift">
    <img alt="monthly downloads" src="https://img.shields.io/npm/dm/@prettier/plugin-swift.svg?style=flat-square">
  </a> -->
  <a href="#badge">
    <img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square">
  </a>
  <a href="https://twitter.com/PrettierCode">
    <img alt="Follow+Prettier+on+Twitter" src="https://img.shields.io/twitter/follow/prettiercode.svg?label=follow+prettier&style=flat-square">
  </a>
</p>

## What does it do?

**:warning: Warning :warning:** This plugin might eat your homework in its early stage.
It also depends on [Swift's lib/Syntax](https://github.com/apple/swift/blob/master/lib/Syntax) which is
[in flux](https://github.com/apple/swift/blob/master/lib/Syntax/Status.md).
Please stage or commit your code before performing any in-place formatting.

You can check out [how it formatted Artsy's Eidolon](https://github.com/sirlantis/eidolon/pull/1/files).

## Prerequisites

You need one of the following:

1. A [snapshot from March 30, 2018 or later](https://swift.org/download/#snapshots),
2. a recent manual build from Swift's [`master`](https://github.com/apple/swift), or
3. Swift 4.2 (once it's available as a beta or released completely).

Assuming you picked **(1)** please follow the
[installation instructions](https://swift.org/download/#using-downloads),
which recommend updating your `PATH` at the end:

```
TOOLCHAIN=swift-DEVELOPMENT-SNAPSHOT-2018-03-30-a.xctoolchain
export PATH=/Library/Developer/Toolchains/${TOOLCHAIN}/usr/bin/:"${PATH}"
```

Alternatively you can pass the full path to the `swiftc` binary
via the environment variable `PRETTIER_SWIFT_SWIFTC`:

```
TOOLCHAIN=swift-DEVELOPMENT-SNAPSHOT-2018-03-30-a.xctoolchain
export PRETTIER_SWIFT_SWIFTC=/Library/Developer/Toolchains/${TOOLCHAIN}/usr/bin/swiftc
```

## Contributing

If you're interested in contributing to the development of Prettier for Swift, you can follow the [CONTRIBUTING guide from Prettier](https://github.com/prettier/prettier/blob/master/CONTRIBUTING.md), as it all applies to this repository too.

To test it out on a Swift file:

* Clone this repository.
* Run `yarn`.
* Create a file called `test.swift`.
* Run `yarn prettier test.swift` to check the output.

## Install

```bash
yarn add --dev --exact prettier prettier/plugin-swift
```

## Use

```bash
prettier --write "**/*.swift"
```

## Maintainers

<table>
  <tbody>
    <tr>
      <td align="center">
        <a href="https://github.com/sirlantis">
          <img width="150" height="150" src="https://github.com/sirlantis.png?v=3&s=150">
          </br>
          Marcel Jackwerth
        </a>
      </td>
    </tr>
  <tbody>
</table>
