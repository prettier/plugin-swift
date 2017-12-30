"use strict";

const logger = require("prettier/src/cli/logger");

function preCheck(n) {
  if (!n) {
    return "";
  }

  if (typeof n === "string") {
    return n;
  }

  switch (n.presence) {
    case "Missing":
      return "";
    case "Present":
      return null;
    default:
      if (n.presence) {
        logger.warn("Unknown presence:", n.presence);
      }

      return null;
  }
}

module.exports = {
  preCheck
};
