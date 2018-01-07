"use strict";

const tokens = {
  amp_prefix: "&",
  l_paren: "(",
  r_paren: ")",
  l_brace: "{",
  r_brace: "}",
  l_square: "[",
  r_square: "]",
  l_angle: "<",
  r_angle: ">",
  arrow: "->",
  eof: "",
  colon: ":",
  comma: ",",
  equal: "=",
  period: ".",
  period_prefix: ".",
  question_postfix: "?",
  exclaim_postfix: "!",
  at_sign: "@",
  semi: ";",
  question_infix: "?",
  string_quote: '"',
  backslash: "\\",
  string_interpolation_anchor: ")",
  multiline_string_quote: '"""'
};

const poundPrefix = "pound_";

const keywordPrefix = "kw_";

function printToken(token) {
  if (typeof token.text !== "undefined") {
    return token.text;
  }

  const type = token.type;

  if (tokens.hasOwnProperty(type)) {
    return tokens[type];
  } else if (type.startsWith(poundPrefix)) {
    const keyword = type.slice(poundPrefix.length);
    return "#" + keyword;
  } else if (type.startsWith(keywordPrefix)) {
    return type.slice(keywordPrefix.length);
  }

  throw new Error(
    "Don't know how to express " +
      JSON.stringify(type) +
      ":\n" +
      JSON.stringify(token, null, 2)
  );
}

module.exports = {
  printToken,
  tokens
};
