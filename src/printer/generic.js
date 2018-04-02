"use strict";

const assert = require("assert");

const { mapDoc } = require("prettier/src/common/util");
const comments = require("prettier/src/main/comments");

const doc = require("prettier").doc;
const docBuilders = doc.builders;

const { printToken } = require("./tokens");
const { verbatimPrint } = require("./verbatim");
const chain = require("./chain");
const isMemberish = chain.isMemberish;
const printMemberChain = chain.printMemberChain;

const identity = o => o;

const {
  align,
  indent,
  line,
  hardline,
  softline,
  group,
  breakParent,
  join,
  ifBreak
} = docBuilders;

const { smartJoin, concat } = require("./builders");

function printList(path, print) {
  return concat([
    softline,
    group(smartJoin(concat([",", line]), path.map(print, "layout")))
  ]);
}

function printWithoutNewlines(doc) {
  return mapDoc(doc, doc => {
    if (doc === line) {
      return " ";
    } else if (doc === softline) {
      return "";
    }

    return doc;
  });
}

function genericPrint(path, options, print) {
  const n = path.getValue();

  if (typeof n === "string") {
    return n;
  }

  const { type } = n;

  if (!type) {
    throw new Error("Node without type: " + JSON.stringify(n, null, 2));
  }

  const parentType = path.getParentNode() ? path.getParentNode().type : "";

  if (
    type === "r_paren" &&
    parentType.startsWith("_") &&
    parentType.endsWith("Decl")
  ) {
    return ") ";
  } else if (n.token) {
    return printToken(n);
  }

  switch (type) {
    case "SourceFile": {
      const parts = path.map(print, "layout");

      // Only force a trailing newline if there were any contents.
      if (n.layout.length || n.comments) {
        parts.push(hardline);
      }

      parts.unshift(
        concat([comments.printDanglingComments(path, options, true)])
      );

      return concat(parts);
    }
    case "DeclList":
    case "CodeBlockItemList": {
      if (n.layout.length === 0) {
        return " ";
      }

      const isInsideClosureExpression = parentType === "ClosureExpr";
      const isInsideGuardStatement =
        (path.getParentNode(1) || {}).type === "GuardStmt";
      const isInsideDeferStatement =
        (path.getParentNode(1) || {}).type === "DeferStmt";

      const shouldBreak =
        !isInsideGuardStatement &&
        !isInsideDeferStatement &&
        !isInsideClosureExpression;

      return concat([
        shouldBreak ? breakParent : "",
        join(hardline, path.map(print, "layout"))
      ]);
    }
    case "_EnumDeclBlock":
    case "AccessorBlock":
    case "MemberDeclBlock":
    case "CodeBlock": {
      const body = path.map(print, "layout");
      const first = body.shift();
      const last = body.pop();

      // Special case: empty block
      if (!n.layout[1].layout.length) {
        return concat([first, " ", last]);
      }

      return group(
        concat([indent(concat([first, line, ...body])), line, last])
      );
    }
    case "TuplePatternElementList":
    case "GenericRequirementList": {
      if (!n.layout.length) {
        return "";
      }

      return group(indent(printList(path, print)));
    }
    case "AccessorList": {
      return join(line, path.map(print, "layout"));
    }
    case "SwitchCaseList": {
      return concat([
        hardline,
        smartJoin(hardline, path.map(print, "layout")),
        hardline
      ]);
    }
    case "StmtList": {
      const children = path.map(print, "layout");

      if (!children.length) {
        if (n.comments) {
          return concat([
            comments.printDanglingComments(
              path,
              options,
              /* sameIndent */ parentType === "SourceFile"
            ),
            hardline
          ]);
        }

        return "";
      }

      if (parentType === "_CaseBlock") {
        return indent(
          concat([breakParent, softline, join(hardline, children)])
        );
      } else if (
        parentType === "SourceFile" ||
        parentType.match(/DirectiveClause/) ||
        parentType.match(/ConfigDecl/)
      ) {
        return join(hardline, children);
      }

      let forceBreak = children.length > 1;

      if (
        parentType === "ClosureExpr" &&
        path.getParentNode(1).type === "FunctionCallExpr" &&
        path.getParentNode(5).type === "VariableDecl" &&
        path
          .getParentNode(5)
          .layout.some(
            c =>
              c.type === "ModifierList" &&
              c.layout.some(c => c.layout.some(c => c.text === "lazy"))
          )
      ) {
        forceBreak = true;
      }

      return concat([
        indent(concat([softline, join(hardline, children)])),
        forceBreak ? breakParent : "",
        line
      ]);
    }
    case "ClosureParamList": {
      // never break for single parameters or _, _, _,
      if (
        n.layout.length < 2 ||
        n.layout.every(param => param.type === "kw__")
      ) {
        return concat(path.map(print, "layout"));
      }

      return group(indent(printList(path, print)));
    }
    case "_CaseDeclElementList":
    case "CaseItemList":
    case "ConditionElementList":
    case "InheritedTypeList":
    case "PatternBindingList": {
      if (!n.layout.length) {
        return "";
      } else if (n.layout.length === 1) {
        const maybeIndent =
          n.type == "ConditionElementList" ? indent : identity;

        return group(
          concat([
            maybeIndent(concat(path.map(print, "layout"))),
            parentType === "GuardStmt" ? " " : ""
          ])
        );
      } else if (path.getParentNode(1).type === "SwitchCase") {
        return group(
          indent(join(concat([",", line]), path.map(print, "layout")))
        );
      }

      return group(
        concat([
          indent(printList(path, print)),
          parentType === "GuardStmt" ? line : softline
        ])
      );
    }
    // Lists that are already surrounded by characters (parens, braces...)
    // where indenting is handled by the parent node.
    case "FunctionCallArgumentList":
    case "GenericParameterList":
    case "GenericArgumentList":
    case "TupleElementList":
    case "TupleTypeElementList":
    case "FunctionParameterList":
    case "ClosureCaptureItemList": {
      if (!n.layout.length) {
        return "";
      }

      return smartJoin(concat([",", line]), path.map(print, "layout"));
    }
    case "ArrayElementList":
    case "DictionaryElementList": {
      if (!n.layout.length) {
        return "";
      } else if (n.type === "ArrayElementList" && n.layout.length === 1) {
        return concat(path.map(print, "layout"));
      }

      return concat([
        smartJoin(concat([",", line]), path.map(print, "layout")),
        options.trailingComma === "all" ? ifBreak(",", "") : ""
      ]);
    }
    case "SubscriptDecl": {
      const body = path.map(print, "layout");
      const first = body.shift();
      return concat([first, join(" ", body)]);
    }
    case "InitializerDecl":
    case "DeinitializerDecl":
    case "TypealiasDecl":
    case "VariableDecl":
    case "FunctionDecl":
    case "AccessorDecl":
    case "ProtocolDecl":
    case "StructDecl":
    case "ImportDecl":
    case "ExtensionDecl":
    case "ClassDecl": {
      const body = n.layout.slice();
      let prefix;

      if (body[0].type === "AttributeList" || body[0].type === "ModifierList") {
        prefix = body.shift();
      }

      const index = body.findIndex(n => {
        return (
          [
            "identifier",
            "contextual_keyword",
            "kw_subscript",
            "kw_init",
            "kw_deinit",
            "kw_var",
            "kw_let",
            "kw_import"
          ].includes(n.type) ||
          n.type.endsWith("Identifier") ||
          n.type.startsWith("oper_")
        );
      });

      if (index < 0) {
        throw new Error(
          "No identifier found: " + body.map(c => c.type).join(", ")
        );
      }

      const start = body.splice(0, index);
      const middle = [body.shift()];

      if (middle[0].type.startsWith("oper_")) {
        middle.push(" "); // add spacing after operators
      }

      while (
        body[0] &&
        [
          "GenericParameterClause",
          "AccessorParameter",
          "FunctionSignature",
          // For InitializerDecl:
          "ParameterClause",
          "question_postfix",
          "question_infix" // if developer inserted an accidental space
        ].includes(body[0].type)
      ) {
        middle.push(body.shift());
      }

      const last = body.pop();

      Object.assign(n, {
        prefix,
        start,
        middle,
        body,
        last
      });

      return concat([
        prefix ? path.call(print, "prefix") : "",
        group(
          smartJoin(" ", [
            ...path.map(print, "start"),
            concat(path.map(print, "middle")),
            ...path.map(print, "body")
          ])
        ),
        last ? concat([" ", path.call(print, "last")]) : ""
      ]);
    }
    case "_EnumDecl":
    case "_ExtensionDecl": {
      const index = n.layout.findIndex(n => n.type == "l_brace");
      const result = path.map(print, "layout");
      const start = result.slice(0, index);
      const end = result.slice(index);
      return concat([smartJoin(" ", start), " ", ...end]);
    }
    case "GuardStmt": {
      const body = path.map(print, "layout");
      const index = n.layout.findIndex(n => n.type == "kw_else");
      const start = body.slice(0, index);
      const end = body.slice(index);
      return group(concat([smartJoin(" ", start), group(smartJoin(" ", end))]));
    }
    case "ReturnStmt": {
      const result = smartJoin(" ", path.map(print, "layout"));

      return concat([
        path.getParentNode().layout[0] === n &&
        path.getParentNode(3).type === "GuardStmt"
          ? ""
          : breakParent,
        result
      ]);
    }
    case "SwitchCase": {
      return group(indent(join(line, path.map(print, "layout"))));
    }
    case "SwitchStmt": {
      const body = path.map(print, "layout");
      const first = body.shift();
      const variable = body.shift();
      const last = body.pop();
      return concat([first, " ", variable, " ", concat(body), last]);
    }
    case "ThrowStmt": {
      return concat([breakParent, smartJoin(" ", path.map(print, "layout"))]);
    }
    case "CompositionType":
    case "FallthroughStmt":
    case "IfStmt":
    case "AssociatedtypeDecl": // decls
    case "TypeAnnotation": // annotations
    case "OptionalBindingCondition": // conditions
    case "MatchingPatternCondition":
    case "CompositionTypeElementList": // lists
    case "ForInStmt": // statements
    case "WhileStmt":
    case "RepeatWhileStmt":
    case "BreakStmt":
    case "ContinueStmt":
    case "DoStmt":
    case "DeclarationStmt":
    case "ExpressionStmt": {
      return smartJoin(" ", path.map(print, "layout"));
    }
    case "ModifierList": {
      n.body = n.layout.slice();

      if (n.body[0].type === "AttributeList") {
        n.attributes = n.body.shift();
      }

      return concat([
        n.attributes ? path.call(print, "attributes") : "",
        join(" ", path.map(print, "body")),
        n.body.length ? " " : ""
      ]);
    }
    case "AttributeList": {
      if (n.layout.length === 0) {
        return "";
      } else if (
        !parentType.endsWith("Decl") &&
        !path.getParentNode(1).type.endsWith("Decl")
      ) {
        return join(" ", path.map(print, "layout"));
      }

      const inline = n.layout.every(
        c =>
          ["IBOutlet", "IBAction", "objc", "testable"].includes(
            c.layout[1].text
          ) && !(c.layout[2] && c.layout[2].layout.length)
      );

      const breaker = inline ? line : hardline;

      return group(concat([join(breaker, path.map(print, "layout")), breaker]));
    }
    case "TypeInitializerClause":
    case "InitializerClause": {
      n.op = n.layout[0];
      n.end = n.layout.slice(1);

      return concat([
        parentType == "PatternBinding" ? " " : "",
        path.call(print, "op"),
        " ",
        group(...path.map(print, "end"))
      ]);
    }
    case "TryExpr": {
      const body = path.map(print, "layout");
      const last = body.pop();
      return smartJoin(" ", [concat(body), last]);
    }
    case "IsExpr":
    case "AsExpr": {
      const body = path.map(print, "layout");
      const last = body.pop();

      const maybeIndent = doc =>
        parentType === "ExprList" ? doc : indent(doc);

      return group(maybeIndent(concat([line, ...body, " ", last])));
    }
    case "WhereClause":
    case "GenericWhereClause": {
      const body = n.layout.slice();
      n.keyword = body.shift();
      n.body = body;
      return group(
        indent(
          concat([
            softline,
            path.call(print, "keyword"),
            " ",
            join(" ", path.map(print, "body"))
          ])
        )
      );
    }
    case "ExprList": {
      if (
        n.layout.length === 3 &&
        n.layout[1].type === "AssignmentExpr" &&
        ([
          "ArrayExpr",
          "DictionaryExpr",
          "FunctionCallExpr",
          "ClosureExpr"
        ].includes(n.layout[2].type) ||
          n.layout[2].type.endsWith("LiteralExpr"))
      ) {
        return group(concat(path.map(print, "layout")));
      }

      return group(indent(concat(path.map(print, "layout"))));
    }
    case "StringInterpolationExpr": {
      return printWithoutNewlines(concat(path.map(print, "layout")));
    }
    case "CatchClauseList": {
      return join(" ", path.map(print, "layout"));
    }
    case "ElseDirectiveClause":
    case "ElseifDirectiveClause":
    case "_IfWithElseConfigDecl":
    case "IfConfigDecl": {
      const hasCondition = type != "ElseDirectiveClause";
      const body = n.layout.slice();

      n.keyword = body.shift();
      n.condition = hasCondition ? body.shift() : undefined;
      n.code = body.shift();
      n.tail = body;

      const condition =
        hasCondition && printWithoutNewlines(path.call(print, "condition"));

      return concat([
        path.call(print, "keyword"),
        hasCondition ? concat([" ", condition]) : "",
        join(hardline, [
          indent(concat([hardline, path.call(print, "code")])),
          ...path.map(print, "tail")
        ])
      ]);
    }
    case "DictionaryType": {
      const body = path.map(print, "layout");
      assert.strictEqual(body.length, 5);
      const left = body.slice(0, 3);
      const right = body.slice(3);
      return join(" ", [concat(left), concat(right)]);
    }
    case "PatternBinding": {
      const body = path.map(print, "layout");

      // Explicit insertion of space for accessor blocks:
      // `var name: String_HERE_{ return "123" }`
      if (n.layout[n.layout.length - 1].type === "AccessorBlock") {
        const rest = body.pop();
        return concat([...body, " ", rest]);
      }

      return concat(path.map(print, "layout"));
    }
    case "TokenList": {
      const printedTokens = path.map(print, "layout");
      const elements = [];
      let currentElement = [];

      const leftParen = printedTokens.shift();
      const rightParen = printedTokens.pop();

      printedTokens.forEach(t => {
        if (t === ",") {
          elements.push(currentElement);
          currentElement = [];
        } else {
          currentElement.push(t);
        }
      });

      if (currentElement.length > 0) {
        elements.push(currentElement);
      }

      return concat([
        leftParen,
        join(", ", elements.map(e => join(" ", e))),
        rightParen
      ]);
    }
    case "_CaseDecl": {
      const body = path.map(print, "layout");
      const keyword = body.shift();
      return concat([keyword, " ", ...body]);
    }
    case "ParameterClause": {
      if (n.layout[1].layout.length === 0) {
        return concat(path.map(print, "layout"));
      }

      const body = path.map(print, "layout");
      const first = body.shift();
      const last = body.pop();

      return group(
        concat([
          group(concat([indent(concat([first, softline, ...body])), softline])),
          last
        ])
      );
    }
    case "TypeInheritanceClause": {
      const body = path.map(print, "layout");
      const first = body.shift();
      return concat([first, " ", group(indent(smartJoin(" ", body)))]);
    }
    case "FunctionSignature": {
      return smartJoin(" ", path.map(print, "layout"));
    }
    case "ClosureSignature": {
      const body = path.map(print, "layout");
      const inKeyword = body.pop();

      const numberOfStatements = path
        .getParentNode()
        .layout.find(n => n.type == "CodeBlockItemList").layout.length;

      const printedBody = concat([join(line, body), " ", inKeyword]);

      // Never break for an empty closure expr
      if (numberOfStatements === 0) {
        return group(printedBody);
      }

      return group(indent(indent(concat([softline, group(printedBody)]))));
    }
    case "CatchClause": {
      return smartJoin(" ", path.map(print, "layout"));
    }
    case "DeferStmt":
    case "ValueBindingPattern":
    case "AttributedType":
    case "ReturnClause": {
      return group(smartJoin(" ", path.map(print, "layout")));
    }
    case "ClosureCaptureSignature":
    case "TupleExpr":
    case "TupleType":
    case "DictionaryExpr":
    case "ArrayExpr": {
      const list = n.layout[1];

      if (
        // Never break inside [:]
        !list.layout ||
        // Never break inside `[]` or `()`
        list.layout.length === 0 ||
        // Never break single element tuples or arrays
        (list.layout.length < 2 &&
          ["TupleExpr", "TupleType", "ArrayExpr"].includes(n.type))
      ) {
        return group(concat(path.map(print, "layout")));
      }

      n.left = n.layout[0];
      n.list = list;
      n.right = n.layout[2];
      n.rest = n.layout.slice(3);

      return group(
        smartJoin(" ", [
          concat([
            path.call(print, "left"),
            indent(concat([softline, path.call(print, "list")])),
            softline,
            path.call(print, "right")
          ]),
          ...path.map(print, "rest")
        ])
      );
    }
    case "FunctionType": {
      const parts = [];

      for (let i = 0; i < n.layout.length; i++) {
        const child = n.layout[i];

        if (child.type === "l_paren") {
          parts.push({
            type: "TupleType",
            layout: n.layout.slice(i, i + 3)
          });

          i += 2;
        } else {
          parts.push(child);
        }
      }

      n.parts = parts;
      return group(smartJoin(" ", path.map(print, "parts")));
    }
    case "GenericArgument":
    case "SameTypeRequirement":
    case "ConformanceRequirement":
    case "InheritedType":
    case "CaseItem":
    case "ClosureCaptureItem":
    case "ClosureParam":
    case "CompositionTypeElement":
    case "ConditionElement":
    case "TuplePatternElement":
    case "TupleTypeElement":
    case "ArrayElement":
    case "DictionaryElement":
    case "TupleElement":
    case "GenericParameter":
    case "FunctionCallArgument":
    case "FunctionParameter": {
      return group(
        smartJoin(
          " ",
          path.map(() => {
            return path.getValue().type === "comma" ? "" : print(path);
          }, "layout")
        )
      );
    }
    case "_CaseDeclElement": {
      const hasComma = n.layout.some(n => n.type === "comma");
      const hasInitializerClause = n.layout.some(
        n => n.type === "InitializerClause"
      );

      const body = path.map(print, "layout");

      if (hasComma) {
        body.pop();
      }

      if (hasInitializerClause) {
        const last = body.pop();
        return group(concat([concat(body), " ", last]));
      }

      return group(concat(body));
    }
    case "ClosureExpr": {
      const body = path.map(print, "layout");
      const first = body.shift();
      const last = body.pop();
      const signature = body.length === 1 ? null : body.shift();
      const parent = path.getParentNode();
      const closureIsCallee = parent.layout[0] === n;

      // Don't break when there's no statements, e.g. `{ _ in }`
      const hasStatements = n.layout.some(
        c => c.type === "CodeBlockItemList" && c.layout.length > 0
      );

      const hasNamedParameters = n.layout.some(
        c =>
          c.type === "ClosureSignature" &&
          c.layout.some(
            c =>
              c.type === "ClosureParamList" &&
              c.layout.some(c =>
                c.layout.some(c => c.type === "identifier" && c.text)
              )
          )
      );

      // Always break if parameters are named
      const shouldBreak =
        hasStatements && (closureIsCallee || hasNamedParameters);

      // Ensure space when trailing closure `it { ... }`
      const prefix =
        parent.type === "FunctionCallExpr" && !closureIsCallee ? " " : "";

      return group(
        concat([
          prefix,
          first,
          signature ? concat([" ", signature]) : "",
          hasStatements ? indent(concat([line, ...body])) : "",
          shouldBreak ? hardline : line,
          last
        ])
      );
    }
    case "Backtick": {
      return "`";
    }
    case "Tab":
    case "Space": {
      return ""; // ignore
    }
    case "Newline": {
      return n.value >= 2 ? hardline : "";
    }
    case "GarbageText":
    case "DocBlockComment":
    case "DocLineComment":
    case "BlockComment":
    case "LineComment": {
      return concat([
        options.leading ? "" : hardline,
        n.value,
        options.leading ? hardline : ""
      ]);
    }
    case "Unknown":
    case "UnknownType":
    case "UnknownExpr":
    case "UnknownDecl":
    case "UnknownStmt": {
      const fallback = verbatimPrint(n)
        .replace(/^[ \t]+/, "")
        .replace(/^[\n]+/, s => (s.split("\n").length >= 2 ? "\n" : ""))
        .replace(/\s+$/, s => (s.split("\n").length >= 2 ? "\n" : ""));

      const shorten = s => {
        if (s[0] === "\n") {
          s = s.slice(1);
        }

        s = fallback.replace(/\n/g, "\u23ce");

        if (s.length > 30) {
          s = s.slice(0, 30) + "\u2026";
        }

        return s;
      };

      const message = "libSyntax(" + type + "): " + shorten(fallback);

      if (!process.env.PRETTIER_SWIFT_RENDER_UNKNOWN) {
        throw new Error(message);
      }

      // eslint-disable-next-line no-console
      console.warn(message);

      if (type === "UnknownExpr") {
        return concat(path.map(print, "layout"));
      }

      return join(hardline, fallback.split("\n"));
    }
    case "AssignmentExpr": {
      return concat([" ", ...path.map(print, "layout"), " "]);
    }
    case "BinaryOperatorExpr": {
      const operator = n.layout[0];

      if (operator.type.endsWith("_unspaced")) {
        return concat(path.map(print, "layout"));
      }

      const allowBreak = !operator.text.endsWith("=");

      return concat([
        allowBreak ? line : " ",
        ...path.map(print, "layout"),
        " "
      ]);
    }
    case "MemberAccessExpr": {
      const parts = path.map(print, "layout");
      const first = parts.shift();
      return concat([group(first), concat(parts)]);
    }
    case "FunctionCallExpr": {
      if (!options.argumentsOnly && n.layout[0] && isMemberish(n.layout[0])) {
        n.callee = n.layout[0];
        n.callee.object = n.callee.layout[0];

        try {
          return printMemberChain(path, options, print);
        } catch (error) {
          throw error;
        }
      }

      const leftIndex = n.layout.findIndex(n => n.type === "l_paren");
      const rightIndex = n.layout.findIndex(n => n.type === "r_paren");

      if (leftIndex < 0 || rightIndex < 0) {
        n.start = n.layout.slice(options.argumentsOnly ? 1 : 0);
        return group(concat(path.map(print, "start")));
      }

      const start = options.argumentsOnly
        ? n.layout.slice(leftIndex, leftIndex + 1)
        : n.layout.slice(0, leftIndex + 1);
      const middle = n.layout.slice(leftIndex + 1, rightIndex);
      const end = n.layout.slice(rightIndex);

      Object.assign(n, {
        start,
        middle,
        end
      });

      // Optimize: Never break inside if we don't have a parameter
      if (middle[0] && middle[0].layout.length == 0) {
        return concat([...path.map(print, "start"), ...path.map(print, "end")]);
      }

      if (
        middle[0].layout.length == 1 &&
        // Optimize: Just a closure as argument (RxSwift)
        //
        // observable.subscribe(onNext: {
        //   ...
        // })
        (middle[0].layout[0].layout.some(n => n.type === "ClosureExpr") ||
          // Optimize: Plain function invocation as only argument
          //
          // array.add(User(
          //   name: "John Doe"
          // })
          middle[0].layout[0].layout.some(
            n =>
              n.type === "FunctionCallExpr" &&
              n.layout[0].type === "IdentifierExpr"
          ) ||
          // Optimize: Array or Dictionary expressions as only argument
          //
          // array.add([
          //   1,
          //   2,
          //   3
          // })
          middle[0].layout[0].layout.some(n =>
            ["ArrayExpr", "DictionaryExpr"].includes(n.type)
          ))
      ) {
        return concat([
          ...path.map(print, "start"),
          group(concat(path.map(print, "middle"))),
          ...path.map(print, "end")
        ]);
      }

      return concat([
        ...path.map(print, "start"),
        group(
          concat([
            indent(concat([softline, ...path.map(print, "middle")])),
            softline
          ])
        ),
        ...path.map(print, "end")
      ]);
    }
    case "TernaryExpr": {
      const [condition, questionMark, ifTrue, colon, ifFalse] = path.map(
        print,
        "layout"
      );

      const maybeIndent = doc =>
        ["ExprList", "TernaryType"].includes(parentType) ? doc : indent(doc);

      // Break the closing paren to keep the chain right after it:
      // (a
      //   ? b
      //   : c
      // ).call()
      const breakClosingParen = parentType == "MemberAccessExpr";

      return group(
        concat([
          condition,
          maybeIndent(
            concat([
              line,
              questionMark,
              " ",
              ifTrue.type === "TernaryExpr" ? ifBreak("", "(") : "",
              align(2, group(ifTrue)),
              ifTrue.type === "TernaryExpr" ? ifBreak("", "(") : "",
              line,
              colon,
              " ",
              align(2, ifFalse)
            ])
          ),
          breakClosingParen ? softline : ""
        ])
      );
    }

    case "SwitchCaseLabel": {
      const body = path.map(print, "layout");
      const first = body.shift();
      const last = body.pop();
      return concat([first, " ", ...body, last]);
    }

    // Types without special formatting but with grouping behavior
    case "_AvailabilityExpr":
    case "_GenericTypeExpr":
    case "_RefExpr":
    case "_SelectorExpr":
    case "AccessorParameter":
    case "AssignExpr":
    case "Attribute":
    case "DeclNameArgument":
    case "DeclNameArgumentList":
    case "DeclNameArguments":
    case "DeclRefExpr":
    case "DiscardAssignmentExpr":
    case "DotSelfExpr":
    case "ExpressionSegment":
    case "ForcedValueExpr":
    case "ForceTryExpr":
    case "GenericArgumentClause":
    case "GenericParameterClause":
    case "IdentifierExpr":
    case "IfExpr":
    case "ImplicitMemberExpr":
    case "InOutExpr":
    case "OptionalChainingExpr":
    case "OptionalTryExpr":
    case "PostfixUnaryExpr":
    case "PrefixOperatorExpr":
    case "PrefixUnaryExpr":
    case "SequenceExpr":
    case "SpecializeExpr":
    case "StringInterpolationSegments":
    case "StringSegment":
    case "SubscriptExpr":
    case "SuperRefExpr":
    case "TupleElementExpr":
    case "TypeExpr":
    case "UnresolvedMemberExpr":
    case "UnresolvedPatternExpr":
      return group(concat(path.map(print, "layout")));

    // Types without special formatting and no grouping behavior
    case "_CaseBlock":
    case "_ClassTypeIdentifier":
    case "AccessPath":
    case "AccessPathComponent":
    case "ArrayType":
    case "BooleanLiteralExpr":
    case "CodeBlockItem":
    case "DeclModifier":
    case "ElseifDirectiveClauseList":
    case "ExpressionPattern":
    case "FloatLiteralExpr":
    case "IdentifierPattern":
    case "ImplicitlyUnwrappedOptionalType":
    case "IntegerLiteralExpr":
    case "InterpolatedStringLiteralExpr":
    case "IsTypePattern":
    case "KeyPathExpr":
    case "MemberTypeIdentifier":
    case "MetatypeType":
    case "NilLiteralExpr":
    case "ObjcKeyPathExpr":
    case "ObjcName":
    case "ObjcNamePiece":
    case "OptionalType":
    case "PoundFileExpr":
    case "PoundFunctionExpr":
    case "PoundLineExpr":
    case "SimpleTypeIdentifier":
    case "StringLiteralExpr":
    case "SwitchDefaultLabel":
    case "TuplePattern":
    case "WildcardPattern":
      return concat(path.map(print, "layout"));

    default:
      if (type.endsWith("LiteralExpr")) {
        // eslint-disable-next-line no-console
        console.warn("Unknown literal expression: " + type);
        return concat(path.map(print, "layout"));
      } else if (type.endsWith("Expr")) {
        // eslint-disable-next-line no-console
        console.warn("Unknown expression: " + type);
        return group(concat(path.map(print, "layout")));
      }

      // Maybe someone forgot to add it here:
      // swift/Syntax/Serialization/SyntaxSerialization.h
      // struct ObjectTraits<TokenDescription>
      error("Unhandled type: " + type);
      return concat(path.map(print, "layout"));
  }
}

function error(message) {
  // eslint-disable-next-line no-console
  console.error(message);

  if (!process.env.IGNORE_ERRORS) {
    throw new Error(message);
  }
}

module.exports = {
  genericPrint
};
