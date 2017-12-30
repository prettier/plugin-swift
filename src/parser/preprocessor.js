"use strict";

const logger = require("prettier/src/cli/logger");

const transferTriviaFromRightToLeft = (left, right) => {
  const trailingTrivia = (left.trailingTrivia || []).concat(
    right.leadingTrivia || [],
    right.trailingTrivia || []
  );

  if (trailingTrivia.length > 0) {
    left.trailingTrivia = trailingTrivia;
  }
};

const transferTriviaFromLeftToRight = (left, right) => {
  const leadingTrivia = (left.leadingTrivia || []).concat(
    left.trailingTrivia || [],
    right.leadingTrivia || []
  );

  if (leadingTrivia.length > 0) {
    right.leadingTrivia = leadingTrivia;
  }
};

/**
 * Pre-processes a parsed AST to work around limitations of the current libSyntax implementation.
 * @param {*} ast
 * @returns True, if modifications were necessary.
 */
function preprocess(ast) {
  let modified = false;

  function visit(node) {
    if (!node.layout) {
      return;
    } else if (!node.kind.startsWith("Unknown")) {
      node.layout.forEach(visit);
      return;
    }

    const layout = node.layout.filter(n => n.presence === "Present");

    if (
      layout.length === 2 &&
      layout[1].tokenKind &&
      layout[1].tokenKind.kind === "semi"
    ) {
      logger.warn("Found semicolon that confused libSyntax. Stripping...");

      transferTriviaFromRightToLeft(layout[0], layout[1]);

      // Clear out current node
      Object.keys(node)
        .filter(k => k.indexOf("Trivia") < 0)
        .forEach(k => {
          delete node[k];
        });

      Object.assign(node, layout[0]);
      modified = true;
    } else if (
      layout.length === 3 &&
      layout[0].tokenKind &&
      layout[0].tokenKind.kind === "l_paren"
    ) {
      logger.warn(
        "Found closure with parens that confused libSyntax. Stripping..."
      );

      transferTriviaFromLeftToRight(layout[0], layout[1]);
      transferTriviaFromRightToLeft(layout[1], layout[2]);
      node.layout = [layout[1]];
      modified = true;
    }

    node.layout.forEach(visit);
  }

  visit(ast);
  return modified;
}

module.exports = { preprocess };
