import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Eye,
  Link2,
  PackageSearch,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../components/common/DataTable.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { StatCard } from "../components/common/StatCard.jsx";
import { StatusPill } from "../components/common/StatusPill.jsx";
import api from "../utils/api.js";
import {
  formatDate,
  formatMovementType,
  formatNumber,
} from "../utils/formatters.js";
import dashboardStyles from "./Dashboard.module.css";

function Dashboard() {
  const [state, setState] = useState({
    error: "",
    loading: true,
    rows: [],
  });

  useEffect(() => {
    let isCancelled = false;

    api
      .get("/inventory/dashboard")
      .then(({ data }) => {
        if (isCancelled) {
          return;
        }

        setState({
          error: "",
          loading: false,
          rows: data.summary || [],
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setState({
          error: error.response?.data?.message || "Unable to load dashboard.",
          loading: false,
          rows: [],
        });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  if (state.loading) {
    return <LoadingSpinner label="Loading dashboard" />;
  }

  if (state.error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        message={state.error}
        title="Dashboard unavailable"
      />
    );
  }

  const statusCounts = state.rows.reduce((counts, row) => {
    const status = row.status || "Unknown";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  const aboveTargetCount = statusCounts["Above Target"] || 0;
  const onTrackCount = statusCounts["On Track"] || 0;
  const watchCount = statusCounts.Watch || 0;
  const lowStockCount = statusCounts["Low Stock"] || 0;
  const criticalStatusCount = statusCounts.Critical || 0;
  const healthyCount = aboveTargetCount + onTrackCount;
  const criticalCount = lowStockCount + criticalStatusCount;
  const needsConfigCount = statusCounts["Set Max Level"] || 0;

  return (
    <div className={dashboardStyles.page}>
      <PageHeader
        description="Track stock health, configuration gaps, and the most recent warehouse activity."
        title="Warehouse Dashboard"
      />

      <section className={dashboardStyles.statGrid}>
        <StatCard
          helper="Canonical products seeded in Phase B"
          icon={Boxes}
          label="Active products"
          tone="accent"
          value={formatNumber(state.rows.length)}
        />
        <StatCard
          details={[
            { label: "Low Stock", value: formatNumber(lowStockCount) },
            { label: "Critical", value: formatNumber(criticalStatusCount) },
          ]}
          helper="Products below the 50% inventory threshold"
          icon={AlertTriangle}
          label="Critical attention"
          tone="danger"
          value={formatNumber(criticalCount)}
        />
        <StatCard
          helper="Products between 50% and 75% of max level"
          icon={Eye}
          label="Watch list"
          tone="warning"
          value={formatNumber(watchCount)}
        />
        <StatCard
          details={[
            { label: "Above Target", value: formatNumber(aboveTargetCount) },
            { label: "On Track", value: formatNumber(onTrackCount) },
          ]}
          helper="Products at or above the 75% health target"
          icon={CheckCircle2}
          label="Healthy stock"
          tone="positive"
          value={formatNumber(healthyCount)}
        />
        <StatCard
          helper="Awaiting `max_level` values from the client"
          icon={PackageSearch}
          label="Needs configuration"
          tone="warning"
          value={formatNumber(needsConfigCount)}
        />
      </section>

      <section className={dashboardStyles.quickActions}>
        <Link className={dashboardStyles.actionCard} to="/stock-in">
          <span>Stock In</span>
          <strong>Record inbound cartons and quantity</strong>
        </Link>
        <Link className={dashboardStyles.actionCard} to="/dispatch">
          <span>Dispatch</span>
          <strong>Open manual dispatch or Shiprocket shell</strong>
        </Link>
        <Link className={dashboardStyles.actionCard} to="/rto">
          <span>RTO</span>
          <strong>Classify return quality outcomes</strong>
        </Link>
      </section>

      <section className="secondaryCard">
        <div className="cardBody">
          <div className={dashboardStyles.sectionHeader}>
            <div>
              <p className={dashboardStyles.eyebrow}>Overview</p>
              <h3>Product health snapshot</h3>
            </div>
            <Link className="secondaryButton" to="/inventory/ledger">
              <Link2 size={16} />
              Open full ledger
            </Link>
          </div>

          <DataTable
            columns={[
              {
                header: "Product",
                key: "product_name",
                render: (row) => (
                  <div className={dashboardStyles.productCell}>
                    <strong>{row.product_name}</strong>
                    <span>{row.category || "Uncategorized"}</span>
                  </div>
                ),
              },
              {
                align: "right",
                header: "Balance",
                key: "balance",
                render: (row) => formatNumber(row.balance),
              },
              {
                header: "Latest Entry",
                key: "latest_entry_date",
                render: (row) =>
                  `${formatDate(row.latest_entry_date)} | ${formatMovementType(
                    row.latest_entry_type
                  )}`,
              },
              {
                header: "Status",
                key: "status",
                render: (row) => <StatusPill value={row.status} />,
              },
              {
                header: "Alert",
                key: "alert",
                render: (row) => <StatusPill kind="alert" value={row.alert} />,
              },
            ]}
            rows={state.rows}
          />
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
