function pickDefinedEntries(entries) {
  return entries.filter(([, value]) => value !== undefined);
}

function normalizeNullableString(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function toIntegerOrNull(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.round(numericValue) : NaN;
}

module.exports = {
  normalizeNullableString,
  pickDefinedEntries,
  toIntegerOrNull,
};
