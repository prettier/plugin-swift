"use strict";

const logger = require("prettier/src/cli/logger");
const { printToken } = require("./tokens");

const characters = {
  Newline: "\n",
  Tab: "\t",
  Space: " ",
};

function triviaPrint(n) {
  const type = n.type || n.kind;

  switch (type) {
    case "Newline":
    case "Tab":
    case "Space":
      return Array(n.value)
        .fill(characters[type])
        .join("");
    default:
      return n.value;
  }
}

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

  let result = "";

  if (n.leadingTrivia) {
    result += n.leadingTrivia.map(triviaPrint).join("");
  }

  if (n.token) {
    result += printToken(n.token);
  } else if (n.tokenKind) {
    result += printToken(
      Object.assign({}, n.tokenKind, { type: n.tokenKind.kind })
    );
  } else {
    result += n.layout.map(verbatimPrint).join("");
  }

  if (n.trailingTrivia) {
    result += n.trailingTrivia.map(triviaPrint).join("");
  }

  return result;
}

module.exports = {
  verbatimPrint
};
