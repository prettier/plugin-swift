"use strict";

const logger = require("prettier/src/cli/logger");
const comments = require("prettier/src/main/comments");
const { mapDoc } = require("prettier/src/common/util");
const tokens = require("./tokens");
const { preCheck } = require("./common");
const { verbatimPrint } = require("./verbatim");

const doc = require("prettier").doc;
const docBuilders = doc.builders;

const chain = require("./chain");
const isMemberish = chain.isMemberish;
const printMemberChain = chain.printMemberChain;

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
  const preCheckResult = preCheck(n);

  if (preCheckResult != null) {
    return preCheckResult;
  }

  const { type } = n;
  if (!type) {
    throw new Error(JSON.stringify(n, null, 2));
  }

  const parentKind = path.getParentNode() ? path.getParentNode().type : "";

  if (type === "colon" && parentKind === "DictionaryType") {
    return ": ";
  } else if (type === "comma" && parentKind === "_CaseDecl") {
    return ", ";
  } else if (type === "equal" && parentKind === "_CaseDecl") {
    return " = ";
  } else if (
    type === "r_paren" &&
    parentKind.startsWith("_") &&
    parentKind.endsWith("Decl")
  ) {
    return ") ";
  } else if (tokens.hasOwnProperty(type)) {
    return tokens[type];
  } else if (type.startsWith("pound_")) {
    const keyword = type.slice("pound_".length);
    return "#" + keyword;
  } else if (type.startsWith("kw_")) {
    const keyword = type.slice("kw_".length);

    switch (keyword) {
      case "deinit": {
        return concat([keyword, " "]);
      }
      case "case": {
        return concat([keyword, parentKind === "_CaseDecl" ? " " : ""]);
      }
      case "in": {
        return concat([keyword, parentKind === "ClosureSignature" ? " " : ""]);
      }
      default: {
        return keyword;
      }
    }
  }

  if (typeof n.text !== "undefined") {
    return n.text;
  }

  switch (type) {
    case "SourceFile": {
      const parts = path.map(print, "layout");

      parts.push(
        comments.printDanglingComments(path, options, /* sameIndent */ true)
      );

      // Only force a trailing newline if there were any contents.
      if (n.layout.length || n.comments) {
        parts.push(hardline);
      }

      return concat(parts);
    }
    case "AccessorBlock": {
      const body = path.map(print, "layout");
      const first = body.shift();
      const last = body.pop();

      return concat([
        parentKind === "_SubscriptDecl" ? "" : " ",
        first,
        " ",
        concat(body),
        last
      ]);
    }
    case "_CaseBlock": {
      return concat(path.map(print, "layout"));
    }
    case "MemberDeclBlock":
    case "CodeBlock": {
      const body = path.map(print, "layout");
      const first = body.shift();
      const last = body.pop();

      if (body.length === 1 && body[0] === "") {
        return concat([first, last]);
      }

      return concat([first, " ", concat(body), last]);
    }
    case "TuplePatternElementList":
    case "GenericRequirementList": {
      if (!n.layout.length) {
        return "";
      }

      return group(indent(printList(path, print)));
    }
    case "AccessorList": {
      if (path.getParentNode(6).type === "ProtocolDecl") {
        return concat([join(" ", path.map(print, "layout")), " "]);
      }

      return concat([
        indent(
          concat([hardline, smartJoin(hardline, path.map(print, "layout"))])
        ),
        hardline
      ]);
    }
    case "_SwitchCaseList": {
      return concat([
        hardline,
        smartJoin(hardline, path.map(print, "layout")),
        hardline
      ]);
    }
    case "DeclList":
    case "StmtList": {
      const children = path.map(print, "layout");

      if (!children.length) {
        return "";
      }

      if (parentKind === "_CaseBlock") {
        return indent(
          concat([breakParent, softline, join(hardline, children)])
        );
      } else if (
        parentKind === "TopLevelCodeDecl" ||
        parentKind === "SourceFile" ||
        parentKind.match(/DirectiveClause/) ||
        parentKind.match(/ConfigDecl/)
      ) {
        return join(hardline, children);
      }

      return concat([
        indent(concat([softline, join(hardline, children)])),
        children.length > 1 ? breakParent : "",
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
    case "ConditionElementList":
    case "CatchClauseList":
    case "InheritedTypeList":
    case "PatternBindingList": {
      if (!n.layout.length) {
        return "";
      } else if (n.layout.length === 1) {
        const maybeIndent =
          n.type == "ConditionElementList" ? indent : id => id;

        return group(
          concat([
            maybeIndent(concat(path.map(print, "layout"))),
            parentKind === "GuardStmt" ? " " : ""
          ])
        );
      }

      return group(
        concat([
          indent(printList(path, print)),
          parentKind === "GuardStmt" ? line : softline
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
    case "_SubscriptDecl":
    case "FunctionDecl":
    case "AccessorDecl":
    case "ProtocolDecl":
    case "StructDecl":
    case "ExtensionDecl":
    case "ClassDecl": {
      const index = n.layout.findIndex(n => {
        return ["identifier", "contextual_keyword", "kw_subscript"].includes(
          n.type
        );
      });

      if (index < 0) {
        return smartJoin(" ", path.map(print, "layout"));
      }

      const start = n.layout.slice(0, index);
      const middle = [n.layout[index]];
      const end = n.layout.slice(index + 1);

      while (
        end[0] &&
        [
          "GenericParameterClause",
          "AccessorParameter",
          "FunctionSignature"
        ].includes(end[0].type)
      ) {
        middle.push(end.shift());
      }

      const last = end.pop();

      Object.assign(n, {
        start,
        middle,
        end,
        last
      });

      return concat([
        group(
          smartJoin(" ", [
            ...path.map(print, "start"),
            concat(path.map(print, "middle")),
            ...path.map(print, "end")
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
        path.getParentNode(2).type === "GuardStmt"
          ? ""
          : breakParent,
        result
      ]);
    }
    case "_SwitchCase": {
      const body = path.map(print, "layout");
      const index = n.layout.findIndex(n => n.type === "colon");
      const start = body.slice(0, index);
      const end = body.slice(index);
      return concat([join(" ", start), join(" ", end)]);
    }
    case "_SwitchStmt": {
      const body = path.map(print, "layout");
      const first = body.shift();
      const variable = body.shift();
      const last = body.pop();
      return concat([first, " ", variable, " ", concat(body), last]);
    }
    case "CompositionType":
    case "FallthroughStmt":
    case "IfStmt":
    case "VariableDecl": // decls
    case "_AssociatedTypeDecl":
    case "TypeAnnotation": // annotations
    case "OptionalBindingCondition": // conditions
    case "MatchingPatternCondition":
    case "AttributeList": // lists
    case "ModifierList":
    case "CompositionTypeElementList":
    case "ThrowStmt": // statements
    case "ForInStmt":
    case "BreakStmt":
    case "ContinueStmt":
    case "DeferStmt":
    case "DoStmt":
    case "DeclarationStmt":
    case "ExpressionStmt": {
      return smartJoin(" ", path.map(print, "layout"));
    }
    case "TypeInitializerClause":
    case "InitializerClause": {
      n.op = n.layout[0];
      n.end = n.layout.slice(1);

      return concat([
        parentKind == "PatternBinding" ? " " : "",
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
    case "AsExpr": {
      const body = path.map(print, "layout");
      const last = body.pop();
      return group(indent(concat([" ", ...body, line, last])));
    }
    case "DeclModifier": {
      return concat([
        concat(path.map(print, "layout")),
        parentKind == "_InitDecl" ? " " : ""
      ]);
    }
    case "DeclNameArgumentList":
    case "DeclNameArguments":
    case "DeclNameArgument":
    case "ExprList":
    case "StringInterpolationSegments":
    case "StringSegment":
    case "ExpressionSegment":
    case "AccessorParameter":
    case "Attribute": {
      return group(concat(path.map(print, "layout")));
    }
    case "StringInterpolationExpr": {
      return printWithoutNewlines(concat(path.map(print, "layout")));
    }
    case "ElseifDirectiveClauseList": {
      return concat(path.map(print, "layout"));
    }
    case "ElseDirectiveClause":
    case "ElseifDirectiveClause":
    case "_IfWithElseConfigDecl":
    case "IfConfigDecl": {
      const hasCondition = type != "ElseDirectiveClause";
      n.keyword = n.layout[0];
      n.condition = hasCondition && n.layout[1];
      n.code = n.layout[1 + (hasCondition ? 1 : 0)];
      n.tail = n.layout.slice(2 + (hasCondition ? 1 : 0));

      const condition =
        hasCondition && printWithoutNewlines(path.call(print, "condition"));

      return concat([
        path.call(print, "keyword"),
        hasCondition ? concat([" ", condition]) : "",
        indent(concat([hardline, path.call(print, "code")])),
        hardline,
        ...path.map(print, "tail")
      ]);
    }
    case "PatternBinding":
    case "MemberTypeIdentifier":
    case "DictionaryType":
    case "MetatypeType":
    case "OptionalType":
    case "ImplicitlyUnwrappedOptionalType":
    case "ArrayType":
    case "AccessPath":
    case "AccessPathComponent":
    case "WildcardPattern":
    case "TuplePattern":
    case "ExpressionPattern":
    case "IdentifierPattern":
    case "TopLevelCodeDecl":
    case "SimpleTypeIdentifier":
    case "_InitDecl":
    case "_DeinitDecl":
    case "_CaseDecl":
    case "TokenList": {
      return concat([
        ...path.map(print, "layout"),
        comments.printDanglingComments(path, options, /* sameLine */ true)
      ]);
    }
    case "GenericArgumentClause":
    case "GenericParameterClause": {
      return group(concat(path.map(print, "layout")));
    }
    case "ParameterClause": {
      const body = path.map(print, "layout");
      const first = body.shift();
      const last = body.pop();

      return group(
        concat([
          group(concat([indent(concat([first, softline, ...body])), softline])),
          last,
          parentKind.startsWith("_") ? " " : ""
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
      // Never break for an empty closure expr
      if (
        path.getParentNode().layout.find(n => n.type == "StmtList").layout
          .length === 0
      ) {
        return group(join(" ", path.map(print, "layout")));
      }

      return group(
        indent(indent(concat([softline, join(" ", path.map(print, "layout"))])))
      );
    }
    case "WhereClause":
    case "GenericWhereClause": {
      return group(indent(join(" ", path.map(print, "layout"))));
    }
    case "ImportDecl":
    case "TypealiasDecl":
    case "ValueBindingPattern":
    case "AttributedType":
    case "ReturnClause": {
      return group(smartJoin(" ", path.map(print, "layout")));
    }
    case "ClosureCaptureSignature":
    case "TupleExpr":
    case "DictionaryExpr":
    case "FunctionType":
    case "ArrayExpr": {
      const numberOfElements = n.layout[1].layout && n.layout[1].layout.length;

      // Never break single element tuples or arrays
      if (numberOfElements < 2 && ["TupleExpr", "ArrayExpr"].includes(n.type)) {
        return group(concat(path.map(print, "layout")));
      }

      n.left = n.layout[0];
      n.list = n.layout[1];
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
    case "GenericArgument":
    case "SameTypeRequirement":
    case "ConformanceRequirement":
    case "CatchClause":
    case "InheritedType":
    case "TupleType":
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
    case "ClosureExpr": {
      const body = path.map(print, "layout");
      const first = body.shift();
      const last = body.pop();
      const parent = path.getParentNode();
      const closureIsCallee = parent.layout[0] === n;

      return group(
        concat([
          parent.type === "FunctionCallExpr" && !closureIsCallee ? " " : "",
          first,
          " ",
          group(concat(body)),
          last
        ])
      );
    }
    case "Backtick": {
      return "`";
    }
    case "Space": {
      return ""; // ignore
    }
    case "Newline": {
      return n.value >= 2 ? hardline : "";
    }
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

      logger.warn("libSyntax(" + type + "): " + shorten(fallback));

      if (type === "UnknownExpr") {
        return concat(path.map(print, "layout"));
      }

      return join(hardline, fallback.split("\n"));
    }
    case "AssignmentExpr":
    case "BinaryOperatorExpr": {
      const operator = n.layout[0];

      if (operator.type.endsWith("_unspaced")) {
        return concat(path.map(print, "layout"));
      }

      return concat([" ", ...path.map(print, "layout"), " "]);
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
          // Optimize: Plain function invocation as argument
          //
          // array.add(User(
          //   name: "John Doe"
          // })
          middle[0].layout[0].layout.some(
            n =>
              n.type === "FunctionCallExpr" &&
              n.layout[0].type === "IdentifierExpr"
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
        parentKind === "TernaryExpr" ? doc : indent(doc);

      // Break the closing paren to keep the chain right after it:
      // (a
      //   ? b
      //   : c
      // ).call()
      const breakClosingParen = parentKind == "MemberAccessExpr";

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

    /* istanbul ignore next */
    default:
      if (type.endsWith("LiteralExpr")) {
        return concat(path.map(print, "layout"));
      } else if (type.endsWith("Expr")) {
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
  logger.error(message);

  if (!process.env.IGNORE_ERRORS) {
    throw new Error(message);
  }
}

module.exports = {
  genericPrint
};
