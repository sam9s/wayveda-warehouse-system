import { Download } from "lucide-react";
import { downloadCsv } from "../../utils/formatters.js";

export function CsvExportButton({ columns, filename, rows }) {
  return (
    <button
      className="secondaryButton"
      onClick={() => downloadCsv({ columns, filename, rows })}
      type="button"
    >
      <Download size={16} />
      Export CSV
    </button>
  );
}
