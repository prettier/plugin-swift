"use strict";

const logger = require("prettier/src/cli/logger");
const { printToken } = require("./tokens");

function verbatimPrint(n) {
  switch (n.presence) {
    case "Missing":
      return "";
    case "Present":
      break;
    default:
      if (n.presence) {
        logger.warn("Unknown presence:", n.presence);
      }

      return null;
  }

  let inner;

  if (n.token) {
    inner = printToken(n.token);
  } else if (n.tokenKind) {
    inner = printToken(
      Object.assign({}, n.tokenKind, { type: n.tokenKind.kind })
    );
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
