"use strict";

const doc = require("prettier").doc;
const docBuilders = doc.builders;

const { join, hardline, softline, line } = docBuilders;

function smartJoin(separator, parts) {
  const result = [];
  let lastPart;

  parts.filter(x => x).forEach((part, index) => {
    const firstPart = part.parts ? part.parts[0] : part;
    if (
      index > 0 &&
      firstPart !== ":" &&
      firstPart !== "..." &&
      firstPart !== ")" &&
      firstPart !== "<" &&
      lastPart !== "("
    ) {
      result.push(separator);
    }

    lastPart = part;
    result.push(part);
  });

  return concat(result);
}

function concat(parts) {
  parts = parts.filter(x => x);

  switch (parts.length) {
    case 0:
      return "";
    case 1:
      return parts[0];
    default:
      return docBuilders.concat(parts);
  }
}

module.exports = {
  smartJoin,
  concat,
  join,
  hardline,
  softline,
  line
};
