import commonStyles from "./Common.module.css";

export function DataTable({
  columns,
  emptyMessage = "No records found.",
  rows,
}) {
  return (
    <div className={commonStyles.tableWrap}>
      <table className={commonStyles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                className={column.align === "right" ? commonStyles.alignRight : ""}
                key={column.key}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={row.id || row.product_id || rowIndex}>
                {columns.map((column) => (
                  <td
                    className={column.align === "right" ? commonStyles.alignRight : ""}
                    key={column.key}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className={commonStyles.emptyRow} colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
