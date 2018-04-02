"use strict";

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
  const result = { modified: false };

  function visit(node, parent) {
    if (!node || !node.layout) {
      return;
    } else if (!node.kind.startsWith("Unknown")) {
      node.layout.filter(n => n).forEach(n => visit(n, node));
      return;
    }

    const layout = node.layout.filter(n => n.presence === "Present");

    if (
      layout.length === 2 &&
      layout[1].tokenKind &&
      layout[1].tokenKind.kind === "semi"
    ) {
      const canStrip =
        parent.layout.filter(n => n.presence === "Present").length === 1;

      // eslint-disable-next-line no-console
      console.warn(
        "Found semicolon that confused libSyntax. " +
          (canStrip ? "Stripping" : "Breaking") +
          "..."
      );

      if (!canStrip) {
        (layout[1].leadingTrivia || (layout[1].leadingTrivia = [])).push({
          kind: "Newline",
          value: 1
        });
      }

      transferTriviaFromRightToLeft(layout[0], layout[1]);

      // Clear out current node
      Object.keys(node)
        .filter(k => k.indexOf("Trivia") < 0)
        .forEach(k => {
          delete node[k];
        });

      Object.assign(node, layout[0]);
      result.modified = true;
    } else if (
      layout.length === 3 &&
      layout[0].tokenKind &&
      layout[0].tokenKind.kind === "l_paren" &&
      parent.kind !== "UnknownDecl"
    ) {
      const parameters = layout[1].layout;

      const canStrip = parameters.every(
        n =>
          !n.layout ||
          n.layout.every(
            n => !n || !n.tokenKind || n.tokenKind.kind !== "colon"
          )
      );

      // eslint-disable-next-line no-console
      console.warn(
        "Found closure with " +
          (canStrip ? "optional" : "required") +
          " parentheses that confused libSyntax. " +
          (canStrip ? "Stripping" : "Bailing") +
          "..."
      );

      if (canStrip) {
        transferTriviaFromLeftToRight(layout[0], layout[1]);
        transferTriviaFromRightToLeft(layout[1], layout[2]);
        node.layout = [layout[1]];
        result.modified = true;
      } else {
        result.bail = true;
      }
    }

    node.layout.forEach(c => visit(c, node));
  }

  visit(ast);
  return result;
}

module.exports = { preprocess };
