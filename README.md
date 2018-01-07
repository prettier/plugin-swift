# Prettier Swift Plugin

![](https://i.giphy.com/media/GNvOUgBvLzVwA/giphy.webp)

Check back soon :)

Depends on [libSyntax](https://github.com/apple/swift/blob/master/lib/Syntax)
which is [incomplete](https://github.com/apple/swift/blob/master/lib/Syntax/Status.md).

You can check out how it formatted [Artsy's Eidolon](https://github.com/sirlantis/eidolon/pull/1/files).

## Prerequisites

You need any of the following:

1. Swift 4.2 (in case you are from the future)
2. A [snapshot from 2018-01-05 or later](https://swift.org/download/#snapshots) (sadly CI has been broken since NYE)
3. A custom build of [Swift](https://github.com/apple/swift) after [7476677b](https://github.com/apple/swift/commit/7476677bb29619b2c0f1f9dcc1e67fa910240c9c)

Ensure that `swiftc` points to the correct binary.
Alternatively you can pass the path to `swiftc`
via the `PRETTIER_SWIFT_SWIFTC` or `SWIFTC` environment variables.

<!--

## Install

```bash
yarn add --dev --exact prettier @prettier/plugin-swift
```

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
-->
