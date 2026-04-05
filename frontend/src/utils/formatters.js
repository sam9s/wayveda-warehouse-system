const intFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatNumber(value, fallback = "--") {
  const numericValue = toNumber(value);
  return numericValue === null ? fallback : intFormatter.format(numericValue);
}

export function formatPercent(value, fallback = "--") {
  const numericValue = toNumber(value);
  return numericValue === null ? fallback : `${percentFormatter.format(numericValue)}%`;
}

export function formatDate(value, fallback = "--") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : dateFormatter.format(date);
}

export function formatDateForInput(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function formatMovementType(value) {
  if (!value) {
    return "--";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getStatusTone(value) {
  switch (value) {
    case "Active":
    case "Above Target":
    case "Healthy":
    case "On Track":
    case "Ready for delete":
      return "positive";
    case "Inactive":
    case "Low":
    case "Watch":
    case "Plan Reorder":
    case "Configure":
    case "Set Max Level":
    case "Guided cleanup required":
      return "warning";
    case "Critical":
    case "Low Stock":
    case "Out of Stock":
    case "Order Now":
    case "Reorder Now":
    case "URGENT":
    case "Blocked":
      return "danger";
    default:
      return "neutral";
  }
}

export function getAlertTone(value) {
  switch (value) {
    case "OK":
      return "positive";
    case "Plan Reorder":
    case "Configure":
      return "warning";
    case "Order Now":
    case "Reorder Now":
    case "URGENT":
      return "danger";
    default:
      return "neutral";
  }
}

function escapeCsvCell(value) {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (normalized.includes(",") || normalized.includes('"') || normalized.includes("\n")) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
}

export function downloadCsv({ columns, filename, rows }) {
  const headerRow = columns.map((column) => escapeCsvCell(column.label)).join(",");
  const bodyRows = rows.map((row) =>
    columns.map((column) => escapeCsvCell(column.value(row))).join(",")
  );

  const blob = new Blob([headerRow, ...bodyRows].join("\n"), {
    type: "text/csv;charset=utf-8",
  });

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
