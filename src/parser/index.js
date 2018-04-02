"use strict";

const assert = require("assert");

const { verbatimPrint } = require("../printer/verbatim");
const { emitSyntax, checkVersion } = require("./wrapper");
const preprocessor = require("./preprocessor");
const { printToken } = require("../printer/tokens");

function massage(node) {
  if (node.presence === "Missing") {
    return;
  }

  let {
    tokenKind: token,
    kind: type,
    value,
    text,
    layout,
    leadingTrivia,
    trailingTrivia
  } = node;

  if (token) {
    ({ kind: type, text } = token);
    token = true;
  }

  if (layout) {
    layout = layout
      .filter(v => v)
      .map(massage)
      .filter(v => v);
  }

  if (type === "UnknownDecl") {
    if (layout.some(n => n.type == "kw_extension")) {
      type = "_ExtensionDecl";
    } else if (layout.some(n => n.type == "kw_enum")) {
      type = "_EnumDecl";

      const rBrace = layout.pop();
      const decl = layout.pop();
      const lBrace = layout.pop();

      layout.push({
        type: "_EnumDeclBlock",
        layout: [lBrace, decl, rBrace]
      });
    } else if (layout.some(n => n.type == "kw_case")) {
      type = "_CaseDecl";

      const tokens = layout.splice(1);
      const elements = [];
      let currentElement = [];
      let currentInitializerClause;

      tokens.forEach(n => {
        if (n.type === "comma") {
          currentElement.push(n);

          elements.push({
            type: "_CaseDeclElement",
            layout: currentElement
          });

          currentElement = [];
        } else if (n.type == "equal") {
          currentInitializerClause = {
            type: "InitializerClause",
            layout: [n]
          };
          currentElement.push(currentInitializerClause);
        } else if (currentInitializerClause) {
          currentInitializerClause.layout.push(n);
        } else if (n.type === "Unknown") {
          currentElement.push({
            token: true,
            type: "identifier",
            text: verbatimPrint(n)
          });
        } else {
          currentElement.push(n);
        }
      });

      if (currentElement.length > 0) {
        elements.push({
          type: "_CaseDeclElement",
          layout: currentElement
        });
      }

      layout.push({
        type: "_CaseDeclElementList",
        layout: elements
      });
    } else if (layout.some(n => n.type == "kw_class")) {
      type = "ClassDecl";
    } else if (layout.some(n => n.type == "kw_associatedtype")) {
      type = "AssociatedtypeDecl";
    } else if (layout.some(n => n.type == "pound_if")) {
      type = "_IfWithElseConfigDecl";
    }
  } else if (type === "UnknownStmt") {
    if (
      (layout[0].type === "kw_if" &&
        layout[1].layout[0].layout[0].layout[0].type) === "pound_available"
    ) {
      type = "IfStmt";

      layout[1].type = "ConditionElementList";
      layout[1].layout[0].type = "ConditionElement";
      const expr = layout[1].layout[0].layout[0];

      expr.type = "_AvailabilityExpr";
      expr.layout.push({
        type: "TokenList",
        layout: expr.layout.splice(1)
      });
    }
  } else if (type === "UnknownExpr") {
    if (layout.length === 1 && layout[0].token) {
      const t = layout[0];
      ({ token, type, value, text, layout } = t);

      if (t.leadingTrivia) {
        leadingTrivia = (leadingTrivia || []).concat(t.leadingTrivia);
      }

      if (t.trailingTrivia) {
        trailingTrivia = (trailingTrivia || []).concat(t.trailingTrivia);
      }
    } else if (layout.length === 2 && layout[0].type === "amp_prefix") {
      type = "_RefExpr";
    } else if (
      layout.length === 2 &&
      layout[0].type == "l_square" &&
      layout[1].type == "r_square"
    ) {
      type = "ArrayExpr";
      layout.splice(1, 0, {
        type: "ArrayElementList",
        layout: []
      });
    } else if (
      layout.length == 2 &&
      layout[0].type === "identifier" &&
      layout[1].type === "GenericArgumentClause"
    ) {
      type = "_GenericTypeExpr";
    } else if (
      layout.length == 3 &&
      (layout[0].type.endsWith("TypeExpr") ||
        [
          "IdentifierExpr",
          "MemberAccessExpr",
          "DictionaryExpr",
          "ArrayExpr"
        ].includes(layout[0].type)) &&
      layout[1].type == "period" &&
      layout[2].type == "kw_self"
    ) {
      type = "MemberAccessExpr";
    } else if (
      layout.length == 3 &&
      layout[1].type == "period" &&
      layout[2].type == "integer_literal"
    ) {
      type = "MemberAccessExpr";
    } else if (
      layout.length == 5 &&
      layout[1].type == "period" &&
      layout[2].type == "integer_literal" &&
      layout[3].type == "period"
    ) {
      type = "MemberAccessExpr";
      layout.unshift({
        type: "MemberAccessExpr",
        layout: layout.splice(0, 3)
      });
    } else if (layout.length > 0 && layout[0].type == "pound_selector") {
      type = "_SelectorExpr";
    }
  } else if (type === "UnknownType") {
    if (layout.length === 1 && layout[0].type === "kw_class") {
      type = "_ClassTypeIdentifier";
    }
  } else if (type === "Unknown") {
    if (layout.some(n => n.type == "pound_elseif")) {
      type = "ElseifDirectiveClause";
    } else if (layout.some(n => n.type == "pound_else")) {
      type = "ElseDirectiveClause";
    }
  }

  const massageTrivia = trivia => {
    if (!trivia || trivia.length === 0) {
      return;
    }

    trivia.forEach(trivium => {
      trivium.type = trivium.type || trivium.kind;
      delete trivium.kind;
    });

    return trivia;
  };

  const result = {
    type,
    token,
    value,
    leadingTrivia: massageTrivia(leadingTrivia),
    text,
    layout,
    trailingTrivia: massageTrivia(trailingTrivia)
  };

  Object.defineProperty(result, "nodes", {
    enumerable: false,
    get: function() {
      return this.layout;
    }
  });

  return result;
}

const findLastLeaf = curr => {
  if (
    !curr ||
    curr.token ||
    curr.type == "IdentifierExpr" ||
    curr.type.endsWith("LiteralExpr")
  ) {
    return;
  }

  if (
    curr.type.startsWith("Unknown") ||
    curr.type.endsWith("Stmt") ||
    curr.type == "IfConfigDecl"
  ) {
    return curr;
  }

  if (curr.trailingTrivia && curr.trailingTrivia.length > 0) {
    return curr;
  }

  return (
    findLastLeaf(curr.layout && curr.layout[curr.layout.length - 1]) || curr
  );
};

function preferTrailingOverLeadingTrivia(node, path) {
  const { type, layout } = node;

  if (!layout || layout.length === 0 || node.type.startsWith("Unknown")) {
    return;
  }

  layout.forEach(child =>
    preferTrailingOverLeadingTrivia(child, [node].concat(path))
  );

  const leadingTrivia = (node.leadingTrivia || []).slice();
  const trailingTrivia = (node.trailingTrivia || []).slice();

  const elements = [];

  const canMoveUp = () => {
    switch (node.type) {
      case "StmtList":
      case "CodeBlock":
      case "CodeBlockItemList":
        return path[0].type == "SourceFile";
      case "DeclList":
      case "SourceFile":
        return false;
      default:
        return true;
    }
  };

  if (canMoveUp()) {
    elements.push({
      parent: true,
      type: "(" + type + ")",
      trailingTrivia: leadingTrivia
    });
  }

  elements.push(...layout);
  elements.push({
    type,
    leadingTrivia: trailingTrivia
  });

  for (let leftIndex = 0; leftIndex < elements.length - 1; leftIndex++) {
    const left = elements[leftIndex];
    const right = elements[leftIndex + 1];

    if (left.type.startsWith("Unknown") || right.type.startsWith("Unknown")) {
      continue;
    }

    const rightLeadingTrivia = right.leadingTrivia;

    if (!rightLeadingTrivia || rightLeadingTrivia.length === 0) {
      continue;
    }

    const target = findLastLeaf(left);

    if (!target) {
      continue;
    }

    const targetTrailingTrivia = target.trailingTrivia || [];

    loop: for (
      let triviumIndex = 0;
      triviumIndex < rightLeadingTrivia.length;
      triviumIndex++
    ) {
      const trivium = rightLeadingTrivia[triviumIndex];

      switch (trivium.type) {
        case "Newline":
        case "Tab":
        case "Space":
        case "GarbageText":
        case "DocBlockComment":
        case "DocLineComment":
        case "BlockComment":
        case "LineComment":
          break;
        case "Backtick":
          break loop;
        default:
          throw new Error(
            "Unexpected trivium: " +
              trivium.type +
              "\n" +
              JSON.stringify(trivium, null, 2)
          );
      }

      rightLeadingTrivia.splice(triviumIndex--, 1);
      targetTrailingTrivia.push(trivium);
    }

    if (rightLeadingTrivia.length === 0) {
      right.leadingTrivia = undefined;
    }

    if (targetTrailingTrivia.length > 0) {
      target.trailingTrivia = targetTrailingTrivia;
    }
  }

  node.leadingTrivia = leadingTrivia.length > 0 ? leadingTrivia : undefined;
  node.trailingTrivia = trailingTrivia.length > 0 ? trailingTrivia : undefined;
}

function extractComments(node, path) {
  const processTrivia = (trivia, resultArray, isLeading) => {
    if (!trivia) {
      return;
    }

    let consumeNewline = false;
    let onNewLine = trivia.length && trivia[0].__location.startOffset === 0;

    for (let i = 0; i < trivia.length; i++) {
      const trivium = trivia[i];
      const { type } = trivium;

      switch (type) {
        case "Backtick":
        case "Tab":
        case "Space": {
          break;
        }
        case "Newline": {
          if (consumeNewline) {
            consumeNewline = false;

            trivium.value--;
            trivium.__location.startOffset++;

            if (trivium.value <= 0) {
              trivia.splice(i--, 1);
            }
          } else {
            loop: while (i > 0) {
              const previous = trivia[i - 1];

              switch (previous.type) {
                case "Tab":
                case "Space": {
                  trivia.splice(--i, 1);
                  break;
                }
                case "Newline": {
                  trivium.value += previous.value;
                  trivia.splice(--i, 1);
                  break;
                }
                default: {
                  break loop;
                }
              }
            }
          }

          onNewLine = true;
          break;
        }
        case "GarbageText":
        case "DocBlockComment":
        case "DocLineComment":
        case "BlockComment":
        case "LineComment": {
          const { __location } = trivium;
          let { value } = trivium;

          const isBlockComment = type.endsWith("BlockComment");

          while (i > 0 && ["Space", "Tab"].includes(trivia[i - 1].type)) {
            trivia.splice(--i, 1);
          }

          const couldRemainTrivia =
            onNewLine &&
            !node.token &&
            path[1].type != "IfStmt" &&
            (![
              "DeclList",
              "StmtList",
              "CodeBlock",
              "CodeBlockItemList"
            ].includes(path[0].type) ||
              path[0].layout.length);

          if (isLeading) {
            if (couldRemainTrivia) {
              onNewLine = false;
              consumeNewline = false;
              break;
            }

            if (i > 0 && trivia[i - 1].type === "Newline") {
              const newline = trivia[i - 1];
              newline.value--;
              if (newline.value <= 0) {
                trivia.splice(--i, 1);
              } else {
                newline.__location.endOffset--;
              }
            }
          } else if (couldRemainTrivia) {
            onNewLine = false;
            consumeNewline = false;
            break;
          } else {
            consumeNewline = !isBlockComment;
          }

          const originalValue = value;

          switch (type) {
            case "LineComment":
              value = value.slice(2);
              break;
            case "BlockComment":
              value = value.slice(2, value.length - 2);
              break;
            case "DocLineComment":
              value = value.slice(3);
              break;
            case "DocBlockComment":
              value = value.slice(3, value.length - 2);
              break;
            case "GarbageText":
              break;
            default:
              throw new Error("Unexpected type: " + type);
          }

          const comment = {
            type: isBlockComment ? "CommentBlock" : "CommentLine",
            value,
            originalValue
          };

          Object.defineProperty(comment, "__location", {
            value: __location,
            enumerable: Object.getOwnPropertyDescriptor(trivium, "__location")
              .enumerable
          });

          resultArray.push(comment);
          trivia.splice(i--, 1);
          onNewLine = false;

          break;
        }
        default: {
          throw new Error("Unexpected type: " + type);
        }
      }
    }

    trivia = trivia.filter(t => t.type != "Space");
    return trivia.length > 0 ? trivia : undefined;
  };

  const leadingComments = [];
  node.leadingTrivia = processTrivia(node.leadingTrivia, leadingComments, true);

  const innerComments = [];
  if (node.layout) {
    node.layout.forEach(child =>
      innerComments.push(...extractComments(child, [child].concat(path)))
    );
  }

  const trailingComments = [];
  node.trailingTrivia = processTrivia(node.trailingTrivia, trailingComments);
  return leadingComments.concat(innerComments, trailingComments);
}

function synthesizeLocation(node, start, text) {
  if (!node) {
    return start;
  } else if (Array.isArray(node)) {
    return node.reduce(
      (start, node) => synthesizeLocation(node, start, text),
      start
    );
  }

  const outerLocation = { startOffset: start };

  let current = start;

  current = synthesizeLocation(node.leadingTrivia, current, text);

  const innerLocation = { startOffset: current };

  if (node.layout) {
    current = synthesizeLocation(node.layout, current, text);
  } else if (typeof node.text !== "undefined") {
    const s = node.text;
    assert.strictEqual(text.slice(current, current + s.length), s);
    current += s.length;
  } else if (typeof node.value !== "undefined") {
    if (Number.isInteger(node.value)) {
      current += node.value;
    } else {
      current += node.value.length;
    }
  } else if (node.token) {
    const s = printToken(node);
    assert.strictEqual(text.slice(current, current + s.length), s);
    current += s.length;
  } else {
    throw new Error(
      "Don't know how to express " +
        JSON.stringify(node.type) +
        ":\n" +
        JSON.stringify(node, null, 2)
    );
  }

  innerLocation.endOffset = current;

  current = synthesizeLocation(node.trailingTrivia, current, text);

  outerLocation.endOffset = current;

  const location = node.type.endsWith("List") ? outerLocation : innerLocation;

  Object.defineProperty(node, "__location", {
    value: location,
    enumerable: false
  });

  return current;
}

function preprocess(text, opts) {
  opts.preprocessingCache = {};

  const ast = emitSyntax(text);

  const result = preprocessor.preprocess(ast);

  if (result.bail) {
    // eslint-disable-next-line no-console
    console.warn("libSyntax had issues parsing this file. Skipping...");

    opts.preprocessingCache = {
      ast: {
        kind: "GarbageText",
        value: text
      }
    };
  } else if (result.modified) {
    // eslint-disable-next-line no-console
    console.warn(
      "libSyntax had issues parsing this file. Re-writing and parsing it again..."
    );
    text = verbatimPrint(ast);
  } else {
    opts.preprocessingCache = { ast };
  }

  return text;
}

/** Parses the document */
function parse(text, opts) {
  checkVersion();

  let ast;

  // If we are called a second time (i.e. preprocessingCache is already set)
  // don't do preprocessing again.
  if (opts.preprocessingCache) {
    ast = opts.preprocessingCache.ast;
  } else {
    text = preprocess(text, opts);
    ast = opts.preprocessingCache.ast;
  }

  delete opts.preprocessingCache;

  if (!ast) {
    ast = emitSyntax(text);
  }

  ast = massage(ast);
  preferTrailingOverLeadingTrivia(ast, []);
  const end = synthesizeLocation(ast, 0, text);

  assert.strictEqual(end, text.length);

  ast.comments = extractComments(ast, [ast]);

  return ast;
}

module.exports = { preprocess, parse };
