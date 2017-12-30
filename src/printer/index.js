"use strict";

const comments = require("prettier/src/main/comments");
const logger = require("prettier/src/cli/logger");
const { concat } = require("./builders");
const { genericPrint } = require("./generic");

function hasDanglingComments(node) {
  return (
    node.comments &&
    node.comments.some(comment => !comment.leading && !comment.trailing)
  );
}

module.exports = function(path, options, print) {
  const n = path.getValue();

  if (hasDanglingComments(n)) {
    logger.error("Dangling comment at " + n.type);
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
