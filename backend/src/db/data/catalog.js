const path = require("path");

const OPENING_STOCK_DATE = "2025-07-24";
const IMPORT_DATE_RANGE = {
  min: OPENING_STOCK_DATE,
  max: "2026-04-30",
};
const WORKBOOK_PATH = path.resolve(
  __dirname,
  "../../../../Docs/Wayveda Inventory Sheet.xlsx"
);

const CANONICAL_PRODUCTS = [
  {
    name: "Bum Plumping Cream - 50g",
    category: "Intimate Care",
    openingStock: 1057,
    displayOrder: 1,
  },
  {
    name: "Intimate Whitening Roll-On - 50ml",
    category: "Intimate Care",
    openingStock: 957,
    displayOrder: 2,
  },
  {
    name: "Chocolate Power Roll-On",
    category: "Male Wellness",
    openingStock: 477,
    displayOrder: 3,
  },
  {
    name: "Strawberry Power Roll-On",
    category: "Male Wellness",
    openingStock: 544,
    displayOrder: 4,
  },
  {
    name: "Bhasam Power Capsule",
    category: "Male Wellness",
    openingStock: 494,
    displayOrder: 5,
  },
  {
    name: "Power Shots Sachet",
    category: "Male Wellness",
    openingStock: 472,
    displayOrder: 6,
  },
  {
    name: "Hairfall Control Serum - 50ml",
    category: "Hair Care",
    openingStock: 366,
    displayOrder: 7,
  },
  {
    name: "Hairfall Control Shampoo - 200ml",
    category: "Hair Care",
    openingStock: 448,
    displayOrder: 8,
  },
  {
    name: "Hairfall Control Tablets - 60N",
    category: "Hair Care",
    openingStock: 399,
    displayOrder: 9,
  },
  {
    name: "Anti-Hairfall Kit",
    category: "Hair Care",
    openingStock: 408,
    displayOrder: 10,
  },
  {
    name: "Power Roll Oil Unflavoured",
    category: "Male Wellness",
    openingStock: 0,
    displayOrder: 11,
  },
  {
    name: "Power Shot Oil",
    category: "Male Wellness",
    openingStock: 49,
    displayOrder: 12,
  },
];

const LEDGER_TARGETS = {
  "Bum Plumping Cream - 50g": {
    openingStock: 1057,
    stockIn: 0,
    dispatch: 220,
    rtoRight: 37,
    rtoWrong: 0,
    rtoFake: 7,
    balance: 860,
  },
  "Intimate Whitening Roll-On - 50ml": {
    openingStock: 957,
    stockIn: 926,
    dispatch: 815,
    rtoRight: 70,
    rtoWrong: 0,
    rtoFake: 3,
    balance: 1132,
  },
  "Chocolate Power Roll-On": {
    openingStock: 477,
    stockIn: 4260,
    dispatch: 1859,
    rtoRight: 327,
    rtoWrong: 9,
    rtoFake: 35,
    balance: 3126,
  },
  "Strawberry Power Roll-On": {
    openingStock: 544,
    stockIn: 5548,
    dispatch: 6338,
    rtoRight: 1234,
    rtoWrong: 0,
    rtoFake: 109,
    balance: 770,
  },
  "Bhasam Power Capsule": {
    openingStock: 494,
    stockIn: 2488,
    dispatch: 2290,
    rtoRight: 205,
    rtoWrong: 0,
    rtoFake: 6,
    balance: 885,
  },
  "Power Shots Sachet": {
    openingStock: 472,
    stockIn: 3198,
    dispatch: 3784,
    rtoRight: 493,
    rtoWrong: 0,
    rtoFake: 4,
    balance: 371,
  },
  "Hairfall Control Serum - 50ml": {
    openingStock: 366,
    stockIn: 0,
    dispatch: 26,
    rtoRight: 3,
    rtoWrong: 0,
    rtoFake: 1,
    balance: 341,
  },
  "Hairfall Control Shampoo - 200ml": {
    openingStock: 448,
    stockIn: 0,
    dispatch: 66,
    rtoRight: 10,
    rtoWrong: 0,
    rtoFake: 4,
    balance: 384,
  },
  "Hairfall Control Tablets - 60N": {
    openingStock: 399,
    stockIn: 0,
    dispatch: 118,
    rtoRight: 1,
    rtoWrong: 0,
    rtoFake: 0,
    balance: 282,
  },
  "Anti-Hairfall Kit": {
    openingStock: 408,
    stockIn: 0,
    dispatch: 15,
    rtoRight: 0,
    rtoWrong: 0,
    rtoFake: 0,
    balance: 393,
  },
  "Power Roll Oil Unflavoured": {
    openingStock: 0,
    stockIn: 4740,
    dispatch: 5386,
    rtoRight: 1270,
    rtoWrong: 0,
    rtoFake: 71,
    balance: 482,
  },
  "Power Shot Oil": {
    openingStock: 49,
    stockIn: 0,
    dispatch: 26,
    rtoRight: 4,
    rtoWrong: 0,
    rtoFake: 0,
    balance: 27,
  },
};

const STOCK_IN_DATE_OVERRIDES = {
  "2025-01-12": "2025-12-01",
  "2025-06-12": "2025-12-06",
  "2025-09-12": "2025-12-09",
  "2026-09-12": "2026-01-09",
  "2026-12-03": "2026-03-12",
};

function normalizeProductLabel(value) {
  return String(value || "")
    .replace(/[\u2010-\u2015]/g, "-")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/(\d+)\s*(ml|g|n)\b/gi, "$1$2")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const productAliasEntries = [
  ["Bum Plumping Cream - 50g", "Bum Plumping Cream - 50g"],
  ["Intimate Whitening Roll-On - 50ml", "Intimate Whitening Roll-On - 50ml"],
  ["Intimate Whitening Roll-On - 50 ml", "Intimate Whitening Roll-On - 50ml"],
  ["Chocolate Power Roll-On", "Chocolate Power Roll-On"],
  ["Strawberry Power Roll-On", "Strawberry Power Roll-On"],
  ["Bhasam Power Capsule", "Bhasam Power Capsule"],
  ["Power Shots Sachet", "Power Shots Sachet"],
  ["Power Shots - Sachet", "Power Shots Sachet"],
  ["Power Shots- Sachet", "Power Shots Sachet"],
  ["Power Shots -sachet", "Power Shots Sachet"],
  ["Hairfall Control Serum - 50ml", "Hairfall Control Serum - 50ml"],
  ["Hairfall Control Serum-50ml", "Hairfall Control Serum - 50ml"],
  ["Hairfall Control Shampoo - 200ml", "Hairfall Control Shampoo - 200ml"],
  ["Hairfall Control Shampoo-200ml", "Hairfall Control Shampoo - 200ml"],
  ["Hairfall Control Tablets - 60N", "Hairfall Control Tablets - 60N"],
  ["Hairfall Control Tablets-60N", "Hairfall Control Tablets - 60N"],
  ["Anti-Hairfall Kit", "Anti-Hairfall Kit"],
  ["POWER ROLL OIL UNFLAVOURED", "Power Roll Oil Unflavoured"],
  ["Power Roll Oil Unflavoured", "Power Roll Oil Unflavoured"],
  ["Power Shot Oil", "Power Shot Oil"],
];

const PRODUCT_NAME_MAP = new Map(
  productAliasEntries.map(([rawName, canonicalName]) => [
    normalizeProductLabel(rawName),
    canonicalName,
  ])
);

for (const product of CANONICAL_PRODUCTS) {
  PRODUCT_NAME_MAP.set(normalizeProductLabel(product.name), product.name);
}

function canonicalizeProductName(value) {
  const normalized = normalizeProductLabel(value);
  const canonical = PRODUCT_NAME_MAP.get(normalized);

  if (!canonical) {
    throw new Error(`Unknown product label: ${value}`);
  }

  return canonical;
}

function productSlug(value) {
  return canonicalizeProductName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = {
  CANONICAL_PRODUCTS,
  IMPORT_DATE_RANGE,
  LEDGER_TARGETS,
  OPENING_STOCK_DATE,
  PRODUCT_NAME_MAP,
  STOCK_IN_DATE_OVERRIDES,
  WORKBOOK_PATH,
  canonicalizeProductName,
  normalizeProductLabel,
  productSlug,
};
