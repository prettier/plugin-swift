# Prettier Swift

![](https://i.giphy.com/media/GNvOUgBvLzVwA/giphy.webp)

Check back soon :)

Depends on [libSyntax](https://github.com/apple/swift/blob/master/lib/Syntax)
which is [incomplete](https://github.com/apple/swift/blob/master/lib/Syntax/Status.md).

# Prerequisites

You need any of the following:

1. Swift 4.2 (in case you are from the future)
2. A [snapshot from at least 2018-01-05](https://swift.org/download/#snapshots) (sadly CI is broken since NYE)
3. A custom build of [Swift](https://github.com/apple/swift) after [7476677b](https://github.com/apple/swift/commit/7476677bb29619b2c0f1f9dcc1e67fa910240c9c)

Ensure that `swiftc` points to the correct binary.
Alternatively you can use pass a `SWIFTC` environment variable.

<!--

## Install

```bash
yarn add --dev --exact prettier prettier-swift
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
