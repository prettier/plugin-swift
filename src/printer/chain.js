"use strict";

const util = require("prettier/src/common/util");
const comments = require("prettier/src/main/comments");
const doc = require("prettier").doc;
const {
  indent,
  hardline,
  group,
  breakParent,
  join,
  conditionalGroup
} = doc.builders;
const { willBreak } = doc.utils;

const { concat } = require("./builders");

// We detect calls on member expressions specially to format a
// common pattern better. The pattern we are looking for is this:
//
// arr
//   .map(x => x + 1)
//   .filter(x => x > 10)
//   .some(x => x % 2)
//
// The way it is structured in the AST is via a nested sequence of
// MemberAccessExpr and FunctionCallExpr. We need to traverse the AST
// and make groups out of it to print it in the desired way.
function printMemberChain(path, options, print) {
  // The first phase is to linearize the AST by traversing it down.
  //
  //   a().b()
  // has the following AST structure:
  //   FunctionCallExpr(MemberAccessExpr(FunctionCallExpr(IdentifierExpr)))
  // and we transform it into
  //   [IdentifierExpr, FunctionCallExpr, MemberAccessExpr, FunctionCallExpr]
  const printedNodes = [];

  // Here we try to retain one typed empty line after each call expression or
  // the first group whether it is in parentheses or not
  function shouldInsertEmptyLineAfter(node) {
    const originalText = options.originalText;
    const nextCharIndex = util.getNextNonSpaceNonCommentCharacterIndex(
      originalText,
      node,
      options.locEnd
    );
    const nextChar = originalText.charAt(nextCharIndex);

    // if it is cut off by a parenthesis, we only account for one typed empty
    // line after that parenthesis
    if (nextChar == ")") {
      return util.isNextLineEmptyAfterIndex(originalText, nextCharIndex + 1);
    }

    return util.isNextLineEmpty(originalText, node, options.locEnd);
  }

  function rec(path) {
    const node = path.getValue();
    if (
      node.type === "FunctionCallExpr" &&
      (isMemberish(node.layout[0]) ||
        node.layout[0].type === "FunctionCallExpr")
    ) {
      printedNodes.unshift({
        node: node,
        printed: concat([
          comments.printComments(
            path,
            () =>
              concat([
                printOptionalToken(path),
                printFunctionTypeParameters(path, options, print),
                printArgumentsList(path, options, print)
              ]),
            options
          ),
          shouldInsertEmptyLineAfter(node) ? hardline : ""
        ])
      });

      Object.defineProperty(node, "callee", {
        enumerable: false,
        value: node.layout[0]
      });

      path.call(callee => rec(callee), "callee");
    } else if (isMemberish(node)) {
      printedNodes.unshift({
        node: node,
        printed: comments.printComments(
          path,
          () =>
            node.type === "MemberAccessExpr"
              ? printMemberLookup(path, options, print)
              : printBindExpressionCallee(path, options, print),
          options
        )
      });

      Object.defineProperty(node, "object", {
        enumerable: false,
        value: node.layout[0]
      });

      path.call(object => rec(object), "object");
    } else {
      printedNodes.unshift({
        node: node,
        printed: path.call(print)
      });
    }
  }
  // Note: the comments of the root node have already been printed, so we
  // need to extract this first call without printing them as they would
  // if handled inside of the recursive call.
  const node = path.getValue();
  printedNodes.unshift({
    node,
    printed: concat([
      printOptionalToken(path),
      printFunctionTypeParameters(path, options, print),
      printArgumentsList(path, options, print)
    ])
  });
  path.call(callee => rec(callee), "callee");

  // Once we have a linear list of printed nodes, we want to create groups out
  // of it.
  //
  //   a().b.c().d().e
  // will be grouped as
  //   [
  //     [Identifier, FunctionCallExpr],
  //     [MemberAccessExpr, MemberAccessExpr, FunctionCallExpr],
  //     [MemberAccessExpr, FunctionCallExpr],
  //     [MemberAccessExpr],
  //   ]
  // so that we can print it as
  //   a()
  //     .b.c()
  //     .d()
  //     .e

  // The first group is the first node followed by
  //   - as many FunctionCallExpr as possible
  //       < fn()()() >.something()
  //   - as many array acessors as possible
  //       < fn()[0][1][2] >.something()
  //   - then, as many MemberAccessExpr as possible but the last one
  //       < this.items >.something()
  const groups = [];
  let currentGroup = [printedNodes[0]];
  let i = 1;
  for (; i < printedNodes.length; ++i) {
    if (
      printedNodes[i].node.type === "FunctionCallExpr" ||
      (printedNodes[i].node.type === "MemberAccessExpr" &&
        printedNodes[i].node.computed &&
        isNumericLiteral(printedNodes[i].node.property))
    ) {
      currentGroup.push(printedNodes[i]);
    } else {
      break;
    }
  }
  if (printedNodes[0].node.type !== "FunctionCallExpr") {
    for (; i + 1 < printedNodes.length; ++i) {
      if (
        isMemberish(printedNodes[i].node) &&
        isMemberish(printedNodes[i + 1].node)
      ) {
        currentGroup.push(printedNodes[i]);
      } else {
        break;
      }
    }
  }
  groups.push(currentGroup);
  currentGroup = [];

  // Then, each following group is a sequence of MemberAccessExpr followed by
  // a sequence of FunctionCallExpr. To compute it, we keep adding things to the
  // group until we has seen a FunctionCallExpr in the past and reach a
  // MemberAccessExpr
  let hasSeenFunctionCallExpr = false;
  for (; i < printedNodes.length; ++i) {
    if (hasSeenFunctionCallExpr && isMemberish(printedNodes[i].node)) {
      // [0] should be appended at the end of the group instead of the
      // beginning of the next one
      if (
        printedNodes[i].node.computed &&
        isNumericLiteral(printedNodes[i].node.property)
      ) {
        currentGroup.push(printedNodes[i]);
        continue;
      }

      groups.push(currentGroup);
      currentGroup = [];
      hasSeenFunctionCallExpr = false;
    }

    if (printedNodes[i].node.type === "FunctionCallExpr") {
      hasSeenFunctionCallExpr = true;
    }
    currentGroup.push(printedNodes[i]);

    if (
      printedNodes[i].node.comments &&
      printedNodes[i].node.comments.some(comment => comment.trailing)
    ) {
      groups.push(currentGroup);
      currentGroup = [];
      hasSeenFunctionCallExpr = false;
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // There are cases like Object.keys(), Observable.of(), _.values() where
  // they are the subject of all the chained calls and therefore should
  // be kept on the same line:
  //
  //   Object.keys(items)
  //     .filter(x => x)
  //     .map(x => x)
  //
  // In order to detect those cases, we use an heuristic: if the first
  // node is just an identifier with the name starting with a capital
  // letter, just a sequence of _$ or this. The rationale is that they are
  // likely to be factories.
  function isFactory(node) {
    return (
      node.type === "kw_self" ||
      (node.text && node.text.match(/(^[A-Z])|^[_$]+$/))
    );
  }

  const shouldMerge =
    groups.length >= 2 &&
    !groups[1][0].node.comments &&
    ((groups[0].length === 1 &&
      (groups[0][0].node.type === "kw_self" ||
        groups[0][0].node.type.endsWith("TypeExpr") ||
        groups[0][0].node.type.endsWith("SpecializeExpr") ||
        (groups[0][0].node.type === "IdentifierExpr" &&
          (isFactory(groups[0][0].node.layout[0]) ||
            (groups[1].length && groups[1][0].node.computed))))) ||
      (groups[0].length > 1 &&
        groups[0][groups[0].length - 1].node.type === "MemberAccessExpr" &&
        groups[0][groups[0].length - 1].node.layout[2].type === "identifier" &&
        (isFactory(groups[0][groups[0].length - 1].node.layout[2]) ||
          (groups[1].length && groups[1][0].node.computed))));

  function printGroup(printedGroup) {
    return concat(printedGroup.map(tuple => tuple.printed));
  }

  function printIndentedGroup(groups) {
    if (groups.length === 0) {
      return "";
    }
    return indent(
      group(concat([hardline, join(hardline, groups.map(printGroup))]))
    );
  }

  const printedGroups = groups.map(printGroup);
  const oneLine = concat(printedGroups);

  const cutoff = shouldMerge ? 3 : 2;
  const flatGroups = groups
    .slice(0, cutoff)
    .reduce((res, group) => res.concat(group), []);

  const hasComment =
    flatGroups.slice(1, -1).some(node => hasLeadingComment(node.node)) ||
    flatGroups.slice(0, -1).some(node => hasTrailingComment(node.node)) ||
    (groups[cutoff] && hasLeadingComment(groups[cutoff][0].node));

  // If we only have a single `.`, we shouldn't do anything fancy and just
  // render everything concatenated together.
  if (groups.length <= cutoff && !hasComment) {
    return group(concat(printedGroups));
  }

  // Find out the last node in the first group and check if it has an
  // empty line after
  const lastNodeBeforeIndent = util.getLast(
    shouldMerge ? groups.slice(1, 2)[0] : groups[0]
  ).node;
  const shouldHaveEmptyLineBeforeIndent =
    lastNodeBeforeIndent.type !== "FunctionCallExpr" &&
    shouldInsertEmptyLineAfter(lastNodeBeforeIndent);

  const expanded = concat([
    printGroup(groups[0]),
    shouldMerge ? concat(groups.slice(1, 2).map(printGroup)) : "",
    shouldHaveEmptyLineBeforeIndent ? hardline : "",
    printIndentedGroup(groups.slice(shouldMerge ? 2 : 1))
  ]);

  const functionCallExprCount = printedNodes.filter(
    tuple => tuple.node.type === "FunctionCallExpr"
  ).length;

  // We don't want to print in one line if there's:
  //  * A comment.
  //  * 3 or more chained calls.
  //  * Any group but the last one has a hard line.
  // If the last group is a function it's okay to inline if it fits.
  if (
    hasComment ||
    functionCallExprCount >= 3 ||
    printedGroups.slice(0, -1).some(willBreak)
  ) {
    return group(expanded);
  }

  return concat([
    // We only need to check `oneLine` because if `expanded` is chosen
    // that means that the parent group has already been broken
    // naturally
    willBreak(oneLine) || shouldHaveEmptyLineBeforeIndent ? breakParent : "",
    conditionalGroup([oneLine, expanded])
  ]);
}

function isNumericLiteral(node) {
  return node.type === "IntegerLiteralExpr";
}

function isMemberish(node) {
  return node.type === "MemberAccessExpr" || node.type === "ImplicitMemberExpr";
}

function printOptionalToken() {
  return "";
}

function printFunctionTypeParameters() {
  return "";
}

function printBindExpressionCallee(path) {
  const part = path.getValue().layout.find(l => l.type == "identifier");
  return part.text;
}

function printArgumentsList(path, options, print) {
  return require("./generic").genericPrint(
    path,
    Object.assign({}, options, { argumentsOnly: true }),
    print
  );
}

function printMemberLookup(path, options, print) {
  const n = path.getValue();
  n.memberLookup = n.layout.slice(1);
  return concat(path.map(print, "memberLookup"));
}

function hasLeadingComment(node) {
  return node.comments && node.comments.some(comment => comment.leading);
}

function hasTrailingComment(node) {
  return node.comments && node.comments.some(comment => comment.trailing);
}

module.exports = {
  printMemberChain,
  isMemberish
};
