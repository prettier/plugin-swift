<p align="center">
  <img src="https://i.giphy.com/media/GNvOUgBvLzVwA/giphy.webp" alt="Under Construction" /> 
</p>

<p align="center">
    Check back soon :yum:
</p>

<h2 align="center">Swift Plugin for the Opinionated Code Formatter</h2>

<p align="center">
  <a href="https://gitter.im/jlongster/prettier">
    <img alt="Gitter" src="https://img.shields.io/gitter/room/jlongster/prettier.svg?style=flat-square">
  </a>
  <a href="https://travis-ci.org/prettier/prettier-swift">
    <img alt="Travis" src="https://img.shields.io/travis/prettier/prettier-swift/master.svg?style=flat-square">
  </a>
  <a href="https://www.npmjs.com/package/prettier">
    <img alt="npm version" src="https://img.shields.io/npm/v/@prettier/plugin-swift.svg?style=flat-square">
  </a>
  <!-- <a href="https://www.npmjs.com/package/prettier">
    <img alt="monthly downloads" src="https://img.shields.io/npm/dm/@prettier/plugin-swift.svg?style=flat-square">
  </a> -->
  <a href="#badge">
    <img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square">
  </a>
  <a href="https://twitter.com/PrettierCode">
    <img alt="Follow+Prettier+on+Twitter" src="https://img.shields.io/twitter/follow/prettiercode.svg?label=follow+prettier&style=flat-square">
  </a>
</p>

---

**Warning:** This plugin might eat your homework in its current shape.
It depends on [Swift's lib/Syntax](https://github.com/apple/swift/blob/master/lib/Syntax) which is
[under heavy development](https://github.com/apple/swift/blob/master/lib/Syntax/Status.md).
Please ensure you have all your code committed or at least staged
before you perform in-place formatting using the `--write` argument.

---

## What does it do?

You can check out [how it formatted Artsy's Eidolon](https://github.com/sirlantis/eidolon/pull/1/files).

## Prerequisites

You need any of the following:

1. Swift 4.1 (in case you are from the future)
2. A [snapshot from January 9, 2018 or later](https://swift.org/download/#snapshots)
3. A `master` build of [Swift](https://github.com/apple/swift)

Ensure that `swiftc` calls the correct binary.

Alternatively you can pass the path to `swiftc`
via the `PRETTIER_SWIFT_SWIFTC` or `SWIFTC` environment variables:

```
export PRETTIER_SWIFT_SWIFTC=/Library/Developer/Toolchains/swift-DEVELOPMENT-SNAPSHOT-2018-01-09-a.xctoolchain/usr/bin/swiftc
```

<!--

## Install

```bash
yarn add --dev --exact prettier @prettier/plugin-swift
```

-->

## Configure

.prettierrc:

```json
{
    "plugins": ["prettier-swift"]
}
```

## Use

```bash
prettier --write "**/*.swift"
```
