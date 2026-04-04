import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { CsvExportButton } from "../components/common/CsvExportButton.jsx";
import { DataTable } from "../components/common/DataTable.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import api from "../utils/api.js";
import {
  formatDate,
  formatMovementType,
  formatNumber,
  formatPercent,
} from "../utils/formatters.js";
import inventoryStyles from "./Inventory.module.css";

const csvColumns = [
  { label: "Product", value: (row) => row.product_name },
  { label: "Category", value: (row) => row.category },
  { label: "Opening Stock", value: (row) => row.opening_stock },
  { label: "Stock In", value: (row) => row.total_received },
  { label: "Dispatch", value: (row) => row.total_dispatched },
  { label: "RTO Right", value: (row) => row.total_rto_right },
  { label: "RTO Wrong", value: (row) => row.total_rto_wrong },
  { label: "RTO Fake", value: (row) => row.total_rto_fake },
  { label: "Balance", value: (row) => row.balance },
  { label: "Stock %", value: (row) => row.stock_percentage },
  { label: "RTO Rate %", value: (row) => row.rto_rate_pct },
];

function InventoryLedger() {
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());
  const [state, setState] = useState({
    error: "",
    loading: true,
    rows: [],
  });

  useEffect(() => {
    let isCancelled = false;

    api
      .get("/inventory/ledger")
      .then(({ data }) => {
        if (isCancelled) {
          return;
        }

        setState({
          error: "",
          loading: false,
          rows: data.ledger || [],
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setState({
          error: error.response?.data?.message || "Unable to load ledger.",
          loading: false,
          rows: [],
        });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  if (state.loading) {
    return <LoadingSpinner label="Loading ledger" />;
  }

  if (state.error) {
    return <EmptyState message={state.error} title="Ledger unavailable" />;
  }

  const filteredRows = deferredSearch
    ? state.rows.filter((row) =>
        `${row.product_name} ${row.category || ""}`
          .toLowerCase()
          .includes(deferredSearch)
      )
    : state.rows;

  return (
    <div className={inventoryStyles.page}>
      <PageHeader
        actions={
          <>
            <label className={inventoryStyles.searchField}>
              <Search size={16} />
              <input
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search product"
                value={searchValue}
              />
            </label>
            <CsvExportButton
              columns={csvColumns}
              filename="wayveda-inventory-ledger.csv"
              rows={filteredRows}
            />
          </>
        }
        description="Approved ledger math: Opening Stock + Stock In + RTO Right - Dispatch."
        eyebrow="Inventory"
        title="Inventory Ledger"
      />

      <div className={inventoryStyles.formulaStrip}>
        <strong>Formula locked:</strong>
        <span>Opening Stock + Stock In + RTO Right - Dispatch</span>
      </div>

      <section className="secondaryCard">
        <div className="cardBody">
          <DataTable
            columns={[
              {
                header: "Product",
                key: "product_name",
                render: (row) => (
                  <div className={inventoryStyles.productCell}>
                    <strong>{row.product_name}</strong>
                    <span>{row.category || "Uncategorized"}</span>
                  </div>
                ),
              },
              {
                align: "right",
                header: "Opening",
                key: "opening_stock",
                render: (row) => formatNumber(row.opening_stock),
              },
              {
                align: "right",
                header: "Received",
                key: "total_received",
                render: (row) => formatNumber(row.total_received),
              },
              {
                align: "right",
                header: "Dispatch",
                key: "total_dispatched",
                render: (row) => formatNumber(row.total_dispatched),
              },
              {
                align: "right",
                header: "RTO Right",
                key: "total_rto_right",
                render: (row) => formatNumber(row.total_rto_right),
              },
              {
                align: "right",
                header: "Balance",
                key: "balance",
                render: (row) => formatNumber(row.balance),
              },
              {
                align: "right",
                header: "Stock %",
                key: "stock_percentage",
                render: (row) => formatPercent(row.stock_percentage),
              },
              {
                header: "Latest Entry",
                key: "latest_entry_date",
                render: (row) =>
                  `${formatDate(row.latest_entry_date)} · ${formatMovementType(
                    row.latest_entry_type
                  )}`,
              },
            ]}
            rows={filteredRows}
          />
        </div>
      </section>
    </div>
  );
}

export default InventoryLedger;
