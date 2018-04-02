"use strict";

const assert = require("assert");
const { printToken } = require("./tokens");

const characters = {
  Newline: "\n",
  Tab: "\t",
  Space: " ",
  Backtick: "`"
};

function triviaPrint(n) {
  const type = n.type || n.kind;

  switch (type) {
    case "Newline":
    case "Tab":
    case "Space":
    case "Backtick":
      return Array(n.value)
        .fill(characters[type])
        .join("");
    case "GarbageText":
    case "DocBlockComment":
    case "DocLineComment":
    case "BlockComment":
    case "LineComment":
      return n.value;
    default:
      throw new Error(
        "Unexpected trivium: " + type + "\n" + JSON.stringify(n, null, 2)
      );
  }
}

function verbatimPrint(n) {
  if (!n) {
    return "";
  } else if (n.presence === "Missing") {
    return "";
  } else if (n.presence) {
    assert.equal(n.presence, "Present");
  }

  let result = "";

  if (n.leadingTrivia) {
    result += n.leadingTrivia.map(triviaPrint).join("");
  }

  if (n.token) {
    result += printToken(n);
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
