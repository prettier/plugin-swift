"use strict";

const comments = require("prettier/src/main/comments");
const { concat } = require("./builders");
const { genericPrint } = require("./generic");

module.exports = function(path, options, print) {
  const n = path.getValue();

  if (!n) {
    throw new Error(
      "Illegal navigation into " +
        path.getName() +
        " from " +
        path.getParentNode().type
    );
  }

  return concat([
    ...(n.leadingTrivia
      ? path.map(
          (path, options) =>
            genericPrint(
              path,
              Object.assign({}, options, { leading: true }),
              print
            ),
          "leadingTrivia"
        )
      : []),
    comments.printComments(
      path,
      () => genericPrint(path, options, print),
      options
    ),
    ...(n.trailingTrivia ? path.map(print, "trailingTrivia") : [])
  ]);
};
