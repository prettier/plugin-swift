"use strict";

const { preCheck } = require("./common");
const tokens = require("./tokens");

function verbatimPrint(n) {
  const preCheckResult = preCheck(n);

  if (preCheckResult != null) {
    return preCheckResult;
  }

  let inner;

  if (n.token || n.tokenKind) {
    const { text } = n.token ? n : n.tokenKind;
    const type = n.token ? n.type : n.tokenKind.kind;

    if (typeof text !== "undefined") {
      inner = text;
    } else if (type.startsWith("pound_")) {
      inner = "#" + type.slice("pound_".length);
    } else if (type.startsWith("kw_")) {
      inner = type.slice("kw_".length);
    } else if (tokens.hasOwnProperty(type)) {
      inner = tokens[type];
    } else {
      throw new Error("No idea how to express '" + type + "'");
    }
  } else {
    inner = n.layout.map(verbatimPrint).join("");
  }

  if (!n.leadingTrivia && !n.trailingTrivia) {
    return inner;
  }

  const printTrivia = n => {
    switch (n.type || n.kind) {
      case "Newline":
        return Array(n.value)
          .fill("\n")
          .join("");
      case "Space":
        return Array(n.value)
          .fill(" ")
          .join("");
      default:
        return n.value;
    }
  };

  return [
    ...(n.leadingTrivia ? n.leadingTrivia.map(printTrivia) : []),
    inner,
    ...(n.trailingTrivia ? n.trailingTrivia.map(printTrivia) : [])
  ].join("");
}

module.exports = {
  verbatimPrint
};
