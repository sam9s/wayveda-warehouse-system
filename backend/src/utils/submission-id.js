const crypto = require("crypto");

function createSubmissionId(entryDate) {
  const compactDate = String(entryDate).replace(/-/g, "");
  const suffix = crypto.randomInt(1000, 10000);
  return `INV-${compactDate}-${suffix}`;
}

module.exports = {
  createSubmissionId,
};
