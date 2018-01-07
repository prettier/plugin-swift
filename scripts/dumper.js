"use strict";

const { printDocToString } = require("prettier").doc.printer;
const printAstToDoc = require("prettier/src/main/ast-to-doc");
const {
  concat,
  hardline,
  join,
  indent,
  group,
  line,
  lineSuffix
} = require("prettier").doc.builders;

function genericPrint(path, options, print) {
  const node = path.getValue();

  if (Array.isArray(node)) {
    if (node.length === 0) {
      return "[]";
    }

    return concat([
      join(hardline, path.map(print).map(s => indent(concat(["- ", s]))))
    ]);
  } else if (node === null) {
    return "~";
  } else if (typeof node === "object") {
    let metadata;

    if (node.__location) {
      metadata = `${node.__location.startOffset}-${node.__location.endOffset}`;
    } else if (node.start && node.end) {
      metadata = `${node.start}-${node.end}`;
    }

    return concat([
      metadata ? lineSuffix(` // ${metadata}`) : "",
      join(
        hardline,
        Object.entries(node)
          .filter(
            entry => !["__location", "loc", "start", "end"].includes(entry[0])
          )
          .filter(entry => typeof entry[1] !== "undefined")
          .map(entry => {
            return group(
              indent(
                concat([
                  entry[0],
                  concat([":", line]),
                  path.call(print, entry[0])
                ])
              )
            );
          })
      )
    ]);
  }

  return JSON.stringify(node);
}

const opts = {
  printWidth: 140,
  tabWidth: 2,
  printer: {
    print: genericPrint,
    willPrintOwnComments: () => {
      return true;
    }
  }
};

module.exports = ast => {
  return printDocToString(printAstToDoc(ast, opts), opts).formatted;
};
