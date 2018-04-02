"use strict";

const spawnSync = require("child_process").spawnSync;

function getCommand() {
  return process.env.PRETTIER_SWIFT_SWIFTC || process.env.SWIFTC || "swiftc";
}

function checkVersion() {
  const result = spawnSync(getCommand(), ["--version"]);

  if (result.error || result.status) {
    throw new Error(result.error || result.stderr.toString());
  }

  const stdout = result.stdout.toString();
  const match = /Swift version ([0-9]+\.[0-9]+(\.[0-9]+)?)/.exec(stdout);

  if (!match) {
    // eslint-disable-next-line no-console
    console.error("Could not detect Swift version:", stdout);
    throw new Error("Unsupported Swift version (required: >4.1): " + stdout);
  }

  const components = match[1].split(".");

  if (components[0] === "4") {
    if (components[1] < 2) {
      throw new Error("Unsupported Swift version. Required: 4.2");
    } else {
      return;
    }
  } else if (components[0] < 4) {
    throw new Error("Unsupported Swift version. Required: 4.2");
  }

  // eslint-disable-next-line no-console
  console.error("Potentially unsupported Swift version. Use Swift 4.2");
}

function emitSyntax(text) {
  const result = spawnSync(getCommand(), ["-frontend", "-emit-syntax", "-"], {
    input: text,
    timeout: 60000
  });

  if (result.error || result.status) {
    throw new Error(result.error || result.stderr.toString());
  }

  return JSON.parse(result.stdout.toString());
}

module.exports = {
  emitSyntax,
  checkVersion
};
