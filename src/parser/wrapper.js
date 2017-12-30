"use strict";

const spawnSync = require("child_process").spawnSync;

function serializeRawTree(text) {
  const result = spawnSync(
    process.env.SWIFTC || "swiftc",
    ["-frontend", "-emit-syntax", "-"],
    {
      input: text,
      timeout: 60000
    }
  );

  if (result.error || result.status) {
    throw new Error(result.error || result.stderr.toString());
  }

  return JSON.parse(result.stdout.toString());
}

module.exports = {
  serializeRawTree
};
