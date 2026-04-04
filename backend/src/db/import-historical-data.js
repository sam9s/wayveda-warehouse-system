const fs = require("fs");
const ExcelJS = require("exceljs");
const { createPool } = require("./client");
const {
  CANONICAL_PRODUCTS,
  IMPORT_DATE_RANGE,
  LEDGER_TARGETS,
  STOCK_IN_DATE_OVERRIDES,
  WORKBOOK_PATH,
  canonicalizeProductName,
  productSlug,
} = require("./data/catalog");

const DRY_RUN = process.argv.includes("--dry-run");
const SHEET_PRIORITY = {
  "Stock In": 1,
  "Daily Dispatch": 2,
  "RTO ": 3,
};

function zeroSummary() {
  return {
    stockIn: 0,
    dispatch: 0,
    rtoRight: 0,
    rtoWrong: 0,
    rtoFake: 0,
  };
}

function formatIsoDate(dateValue) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateText(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return null;
  }

  const dayMonthYear = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = Number(dayMonthYear[2]);
    const yearPart = Number(dayMonthYear[3]);
    const year = yearPart < 100 ? 2000 + yearPart : yearPart;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  const isoDateTime = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateTime) {
    return `${isoDateTime[1]}-${isoDateTime[2]}-${isoDateTime[3]}`;
  }

  return null;
}

function parseLooseDate(rawValue, allowStockInOverrides = false) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return null;
  }

  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    const rawIsoDate = formatIsoDate(rawValue);
    if (allowStockInOverrides && STOCK_IN_DATE_OVERRIDES[rawIsoDate]) {
      return STOCK_IN_DATE_OVERRIDES[rawIsoDate];
    }
    return rawIsoDate;
  }

  const parsedTextDate = parseDateText(rawValue);
  if (!parsedTextDate) {
    return null;
  }

  if (allowStockInOverrides && STOCK_IN_DATE_OVERRIDES[parsedTextDate]) {
    return STOCK_IN_DATE_OVERRIDES[parsedTextDate];
  }

  return parsedTextDate;
}

function assertDateInRange(isoDate, contextLabel) {
  if (isoDate < IMPORT_DATE_RANGE.min || isoDate > IMPORT_DATE_RANGE.max) {
    throw new Error(
      `${contextLabel} resolved to out-of-range date ${isoDate}`
    );
  }
}

function parseImportDate(rawValue, options) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return null;
  }

  const { sheetName, rowNumber, allowStockInOverrides = false } = options;
  const contextLabel = `${sheetName} row ${rowNumber}`;

  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    const rawIsoDate = formatIsoDate(rawValue);
    const overriddenDate = allowStockInOverrides
      ? STOCK_IN_DATE_OVERRIDES[rawIsoDate]
      : null;
    const resolvedDate = overriddenDate || rawIsoDate;

    assertDateInRange(resolvedDate, contextLabel);
    return resolvedDate;
  }

  const parsedTextDate = parseDateText(rawValue);
  if (!parsedTextDate) {
    throw new Error(`${contextLabel} has an unparseable date: ${rawValue}`);
  }

  const resolvedDate =
    allowStockInOverrides && STOCK_IN_DATE_OVERRIDES[parsedTextDate]
      ? STOCK_IN_DATE_OVERRIDES[parsedTextDate]
      : parsedTextDate;

  assertDateInRange(resolvedDate, contextLabel);
  return resolvedDate;
}

function toPositiveInteger(rawValue) {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue > 0 ? Math.round(rawValue) : 0;
  }

  if (
    rawValue === null ||
    rawValue === undefined ||
    rawValue === "" ||
    rawValue instanceof Date
  ) {
    return 0;
  }

  const normalized = String(rawValue).trim();
  if (!normalized || normalized === ".") {
    return 0;
  }

  const numericValue = Number(normalized.replace(/,/g, ""));
  return Number.isFinite(numericValue) && numericValue > 0
    ? Math.round(numericValue)
    : 0;
}

function normalizeWorksheetCellValue(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  if (rawValue instanceof Date) {
    return rawValue;
  }

  if (typeof rawValue !== "object") {
    return rawValue;
  }

  if (Object.prototype.hasOwnProperty.call(rawValue, "result")) {
    return normalizeWorksheetCellValue(rawValue.result);
  }

  if (Array.isArray(rawValue.richText)) {
    return rawValue.richText.map((part) => part.text || "").join("");
  }

  if (typeof rawValue.text === "string") {
    return rawValue.text;
  }

  return null;
}

function worksheetToRows(worksheet) {
  const rows = [];

  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values = [];

    for (let cellNumber = 1; cellNumber <= row.cellCount; cellNumber += 1) {
      values[cellNumber - 1] = normalizeWorksheetCellValue(
        row.getCell(cellNumber).value
      );
    }

    rows[rowNumber - 1] = values;
  });

  return rows;
}

async function loadWorkbook() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);
  return workbook;
}

function parseDispatchGroups(workbook) {
  const rows = worksheetToRows(workbook.getWorksheet("Daily Dispatch"));
  const headerRow = rows[1] || [];
  const productColumns = [];

  for (let columnIndex = 1; columnIndex < headerRow.length; columnIndex += 1) {
    const rawHeader = headerRow[columnIndex];
    if (!rawHeader) {
      continue;
    }

    if (String(rawHeader).trim().toLowerCase() === "sales growth") {
      break;
    }

    productColumns.push({
      columnIndex,
      productName: canonicalizeProductName(rawHeader),
    });
  }

  const groups = [];
  let blankRowStreak = 0;

  for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const hasAnyQuantity = productColumns.some(
      ({ columnIndex }) => toPositiveInteger(row[columnIndex]) > 0
    );

    if (!hasAnyQuantity) {
      const looseDate = parseLooseDate(row[0]);
      if (!looseDate || looseDate > IMPORT_DATE_RANGE.max) {
        blankRowStreak += 1;
        if (blankRowStreak >= 25) {
          break;
        }
      } else {
        blankRowStreak = 0;
      }
      continue;
    }

    blankRowStreak = 0;
    const entryDate = parseImportDate(row[0], {
      sheetName: "Daily Dispatch",
      rowNumber: rowIndex + 1,
    });

    const lines = [];
    for (const { columnIndex, productName } of productColumns) {
      const quantity = toPositiveInteger(row[columnIndex]);
      if (!quantity) {
        continue;
      }

      lines.push({
        productName,
        quantity,
        cartons: null,
        rtoRight: 0,
        rtoWrong: 0,
        rtoFake: 0,
      });
    }

    if (!lines.length) {
      continue;
    }

    groups.push({
      sheetName: "Daily Dispatch",
      movementType: "dispatch",
      rowNumber: rowIndex + 1,
      entryDate,
      lines,
    });
  }

  return groups;
}

function parseRtoGroups(workbook) {
  const rows = worksheetToRows(workbook.getWorksheet("RTO "));
  const headerRow = rows[0] || [];
  const productBlocks = [];

  for (let columnIndex = 1; columnIndex < headerRow.length; columnIndex += 3) {
    const rawHeader = headerRow[columnIndex];
    if (!rawHeader) {
      continue;
    }

    productBlocks.push({
      columnIndex,
      productName: canonicalizeProductName(rawHeader),
    });
  }

  const groups = [];
  let blankRowStreak = 0;

  for (let rowIndex = 3; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const hasAnyValue = productBlocks.some(({ columnIndex }) => {
      return (
        toPositiveInteger(row[columnIndex]) > 0 ||
        toPositiveInteger(row[columnIndex + 1]) > 0 ||
        toPositiveInteger(row[columnIndex + 2]) > 0
      );
    });

    if (!hasAnyValue) {
      const looseDate = parseLooseDate(row[0]);
      if (!looseDate || looseDate > IMPORT_DATE_RANGE.max) {
        blankRowStreak += 1;
        if (blankRowStreak >= 25) {
          break;
        }
      } else {
        blankRowStreak = 0;
      }
      continue;
    }

    blankRowStreak = 0;
    const entryDate = parseImportDate(row[0], {
      sheetName: "RTO ",
      rowNumber: rowIndex + 1,
    });

    const lines = [];
    for (const { columnIndex, productName } of productBlocks) {
      const rtoRight = toPositiveInteger(row[columnIndex]);
      const rtoWrong = toPositiveInteger(row[columnIndex + 1]);
      const rtoFake = toPositiveInteger(row[columnIndex + 2]);

      if (!(rtoRight || rtoWrong || rtoFake)) {
        continue;
      }

      lines.push({
        productName,
        quantity: null,
        cartons: null,
        rtoRight,
        rtoWrong,
        rtoFake,
      });
    }

    if (!lines.length) {
      continue;
    }

    groups.push({
      sheetName: "RTO ",
      movementType: "rto",
      rowNumber: rowIndex + 1,
      entryDate,
      lines,
    });
  }

  return groups;
}

function parseStockInGroups(workbook) {
  const rows = worksheetToRows(workbook.getWorksheet("Stock In"));
  const headerRow = rows[0] || [];
  const productBlocks = [];

  for (let columnIndex = 3; columnIndex < headerRow.length; columnIndex += 3) {
    const rawHeader = headerRow[columnIndex];
    if (!rawHeader) {
      continue;
    }

    productBlocks.push({
      columnIndex,
      productName: canonicalizeProductName(rawHeader),
    });
  }

  const groups = [];
  let blankRowStreak = 0;

  for (let rowIndex = 3; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const hasAnyValue = productBlocks.some(({ columnIndex }) => {
      return toPositiveInteger(row[columnIndex + 2]) > 0;
    });

    if (!hasAnyValue) {
      const looseDate = parseLooseDate(row[2], true);
      if (!looseDate || looseDate > IMPORT_DATE_RANGE.max) {
        blankRowStreak += 1;
        if (blankRowStreak >= 25) {
          break;
        }
      } else {
        blankRowStreak = 0;
      }
      continue;
    }

    blankRowStreak = 0;
    const entryDate = parseImportDate(row[2], {
      sheetName: "Stock In",
      rowNumber: rowIndex + 1,
      allowStockInOverrides: true,
    });

    const lines = [];
    for (const { columnIndex, productName } of productBlocks) {
      const cartons = toPositiveInteger(row[columnIndex]) || null;
      const quantity = toPositiveInteger(row[columnIndex + 2]);

      if (!quantity) {
        continue;
      }

      lines.push({
        productName,
        quantity,
        cartons,
        rtoRight: 0,
        rtoWrong: 0,
        rtoFake: 0,
      });
    }

    if (!lines.length) {
      continue;
    }

    groups.push({
      sheetName: "Stock In",
      movementType: "stock_in",
      rowNumber: rowIndex + 1,
      entryDate,
      lines,
    });
  }

  return groups;
}

function assignSubmissionIds(groups) {
  const sortedGroups = [...groups].sort((left, right) => {
    if (left.entryDate !== right.entryDate) {
      return left.entryDate.localeCompare(right.entryDate);
    }

    if (SHEET_PRIORITY[left.sheetName] !== SHEET_PRIORITY[right.sheetName]) {
      return SHEET_PRIORITY[left.sheetName] - SHEET_PRIORITY[right.sheetName];
    }

    return left.rowNumber - right.rowNumber;
  });

  return sortedGroups.map((group, index) => {
    const sequence = String(index + 1).padStart(4, "0");
    const submissionId = `IMP-${group.entryDate.replace(/-/g, "")}-${sequence}`;

    return {
      ...group,
      submissionId,
      lines: group.lines.map((line, lineIndex) => ({
        ...line,
        submissionLineNo: lineIndex + 1,
      })),
    };
  });
}

function summarizeGroups(groups) {
  const summary = Object.fromEntries(
    CANONICAL_PRODUCTS.map((product) => [product.name, zeroSummary()])
  );

  for (const group of groups) {
    for (const line of group.lines) {
      const target = summary[line.productName];

      if (group.movementType === "stock_in") {
        target.stockIn += line.quantity;
      } else if (group.movementType === "dispatch") {
        target.dispatch += line.quantity;
      } else if (group.movementType === "rto") {
        target.rtoRight += line.rtoRight;
        target.rtoWrong += line.rtoWrong;
        target.rtoFake += line.rtoFake;
      }
    }
  }

  return summary;
}

function assertSummaryMatchesLedger(summary) {
  const mismatches = [];

  for (const product of CANONICAL_PRODUCTS) {
    const expected = LEDGER_TARGETS[product.name];
    const actual = summary[product.name];

    for (const key of [
      "stockIn",
      "dispatch",
      "rtoRight",
      "rtoWrong",
      "rtoFake",
    ]) {
      if (actual[key] !== expected[key]) {
        mismatches.push(
          `${product.name}: expected ${key}=${expected[key]}, got ${actual[key]}`
        );
      }
    }
  }

  if (mismatches.length) {
    throw new Error(
      `Historical import totals do not match the approved ledger.\n${mismatches.join(
        "\n"
      )}`
    );
  }
}

async function fetchProductIds(client) {
  const result = await client.query(
    "SELECT id, name::TEXT AS name FROM products WHERE is_active = TRUE"
  );

  const productIds = new Map(result.rows.map((row) => [row.name, row.id]));

  for (const product of CANONICAL_PRODUCTS) {
    if (!productIds.has(product.name)) {
      throw new Error(
        `Missing seeded product in database: ${product.name}. Run db:seed:products first.`
      );
    }
  }

  return productIds;
}

async function upsertMovement(client, group, line, productId) {
  const idempotencyKey = [
    "import",
    group.movementType,
    group.sheetName.trim().toLowerCase().replace(/\s+/g, "-"),
    group.rowNumber,
    productSlug(line.productName),
  ].join(":");

  await client.query(
    `
      INSERT INTO inventory_movements (
        submission_id,
        submission_line_no,
        entry_date,
        submitted_by,
        movement_type,
        product_id,
        quantity,
        cartons,
        rto_right,
        rto_wrong,
        rto_fake,
        notes,
        source,
        shiprocket_order_id,
        idempotency_key,
        metadata
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16::jsonb
      )
      ON CONFLICT (idempotency_key) DO UPDATE SET
        submission_id = EXCLUDED.submission_id,
        submission_line_no = EXCLUDED.submission_line_no,
        entry_date = EXCLUDED.entry_date,
        submitted_by = EXCLUDED.submitted_by,
        movement_type = EXCLUDED.movement_type,
        product_id = EXCLUDED.product_id,
        quantity = EXCLUDED.quantity,
        cartons = EXCLUDED.cartons,
        rto_right = EXCLUDED.rto_right,
        rto_wrong = EXCLUDED.rto_wrong,
        rto_fake = EXCLUDED.rto_fake,
        notes = EXCLUDED.notes,
        source = EXCLUDED.source,
        shiprocket_order_id = EXCLUDED.shiprocket_order_id,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `,
    [
      group.submissionId,
      line.submissionLineNo,
      group.entryDate,
      "historical_import",
      group.movementType,
      productId,
      line.quantity,
      line.cartons,
      line.rtoRight,
      line.rtoWrong,
      line.rtoFake,
      null,
      "import",
      null,
      idempotencyKey,
      JSON.stringify({
        importSheet: group.sheetName,
        importRowNumber: group.rowNumber,
        importWorkbook: "Docs/Wayveda Inventory Sheet.xlsx",
      }),
    ]
  );
}

async function buildGroups() {
  if (!fs.existsSync(WORKBOOK_PATH)) {
    throw new Error(`Workbook not found: ${WORKBOOK_PATH}`);
  }

  const workbook = await loadWorkbook();
  const groups = assignSubmissionIds([
    ...parseStockInGroups(workbook),
    ...parseDispatchGroups(workbook),
    ...parseRtoGroups(workbook),
  ]);

  assertSummaryMatchesLedger(summarizeGroups(groups));
  return groups;
}

async function main() {
  const groups = await buildGroups();
  const movementCount = groups.reduce(
    (total, group) => total + group.lines.length,
    0
  );

  console.log(
    `Prepared ${groups.length} grouped submissions and ${movementCount} movement rows.`
  );

  if (DRY_RUN) {
    console.log("Dry run complete. No database writes were performed.");
    return;
  }

  const pool = createPool();
  const client = await pool.connect();

  try {
    const productIds = await fetchProductIds(client);
    await client.query("BEGIN");

    for (const group of groups) {
      for (const line of group.lines) {
        await upsertMovement(client, group, line, productIds.get(line.productName));
      }
    }

    await client.query("COMMIT");
    console.log("Historical inventory import completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
