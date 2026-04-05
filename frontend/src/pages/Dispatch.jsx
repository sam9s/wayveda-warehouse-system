import { Cloud, Link2, RefreshCcw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { DataTable } from "../components/common/DataTable.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { StatCard } from "../components/common/StatCard.jsx";
import { Tabs } from "../components/common/Tabs.jsx";
import { DispatchForm } from "../components/forms/DispatchForm.jsx";
import formStyles from "../components/forms/MovementForms.module.css";
import { useAuth } from "../auth/AuthContext.jsx";
import { useProducts } from "../hooks/useProducts.js";
import api from "../utils/api.js";
import { formatDate, formatNumber } from "../utils/formatters.js";
import dispatchStyles from "./Dispatch.module.css";

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const EMPTY_SHIPROCKET_STATUS = {
  configured: false,
  defaults: {
    lookbackDays: 30,
    maxPages: 5,
    pageSize: 50,
  },
  latestSync: null,
  recentLogs: [],
  syncedDispatchCount: 0,
};

function formatDateTime(value, fallback = "--") {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : dateTimeFormatter.format(parsed);
}

function formatSyncStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "Not run yet";
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildSyncSuccessMessage(result) {
  const summary = result?.summary || {};
  const fragments = [
    `${formatNumber(summary.createdOrders || 0, "0")} orders imported`,
    `${formatNumber(summary.createdRows || 0, "0")} dispatch rows created`,
  ];

  if (summary.duplicateOrders) {
    fragments.push(`${formatNumber(summary.duplicateOrders, "0")} duplicates skipped`);
  }

  if (summary.unmappedProducts?.length) {
    fragments.push(
      `${formatNumber(summary.unmappedProducts.length, "0")} unmapped orders need review`
    );
  }

  return fragments.join(" • ");
}

function countLogsByStatus(logs, status) {
  return logs.filter((log) => log.status === status).length;
}

function Dispatch() {
  const { user } = useAuth();
  const { error, loading, products } = useProducts();
  const [activeTab, setActiveTab] = useState("manual");
  const [shiprocketState, setShiprocketState] = useState({
    error: "",
    hasLoaded: false,
    loading: false,
    rows: [],
    status: EMPTY_SHIPROCKET_STATUS,
    success: "",
    syncing: false,
  });

  const canSyncShiprocket = user?.role === "admin" || user?.role === "system_admin";

  useEffect(() => {
    if (activeTab !== "shiprocket" || shiprocketState.hasLoaded) {
      return;
    }

    void loadShiprocketShell();
  }, [activeTab, shiprocketState.hasLoaded]);

  async function loadShiprocketShell() {
    setShiprocketState((current) => ({
      ...current,
      error: "",
      loading: true,
      success: "",
    }));

    try {
      const [statusResponse, dispatchesResponse] = await Promise.all([
        api.get("/shiprocket/status"),
        api.get("/shiprocket/dispatches", {
          params: { limit: 50 },
        }),
      ]);

      setShiprocketState((current) => ({
        ...current,
        error: "",
        hasLoaded: true,
        loading: false,
        rows: dispatchesResponse.data.rows || [],
        status: statusResponse.data || EMPTY_SHIPROCKET_STATUS,
      }));
    } catch (shiprocketError) {
      setShiprocketState((current) => ({
        ...current,
        error:
          shiprocketError.response?.data?.message ||
          "Unable to load the Shiprocket sync shell.",
        hasLoaded: true,
        loading: false,
        rows: [],
        status: current.status,
      }));
    }
  }

  async function handleShiprocketSync() {
    setShiprocketState((current) => ({
      ...current,
      error: "",
      success: "",
      syncing: true,
    }));

    try {
      const { data } = await api.post("/shiprocket/sync", {});

      setShiprocketState((current) => ({
        ...current,
        success: buildSyncSuccessMessage(data),
        syncing: false,
      }));

      await loadShiprocketShell();
      setShiprocketState((current) => ({
        ...current,
        success: buildSyncSuccessMessage(data),
      }));
    } catch (shiprocketError) {
      setShiprocketState((current) => ({
        ...current,
        error:
          shiprocketError.response?.data?.message ||
          "Shiprocket sync failed. Check credentials or try again later.",
        syncing: false,
      }));
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading dispatch form" />;
  }

  if (error) {
    return <EmptyState message={error} title="Dispatch unavailable" />;
  }

  const latestSync = shiprocketState.status.latestSync;
  const recentLogs = shiprocketState.status.recentLogs || [];

  return (
    <div>
      <PageHeader
        actions={
          <Tabs
            items={[
              { label: "Manual Entry", value: "manual" },
              { label: "Shiprocket Synced", value: "shiprocket" },
            ]}
            onChange={setActiveTab}
            value={activeTab}
          />
        }
        description="Manual dispatch remains the fallback path. The Shiprocket tab is read-only and only imports confirmed logistics rows when sync is triggered."
        eyebrow="Movement Entry"
        title="Dispatch"
      />

      {activeTab === "manual" ? (
        <DispatchForm currentUser={user} products={products} />
      ) : (
        <div className={dispatchStyles.shiprocketShell}>
          {shiprocketState.loading && !shiprocketState.hasLoaded ? (
            <LoadingSpinner label="Loading Shiprocket status" />
          ) : (
            <>
              <section className={dispatchStyles.summaryGrid}>
                <StatCard
                  helper={
                    shiprocketState.status.configured
                      ? "Credentials are configured on the server."
                      : "Server credentials are still missing."
                  }
                  icon={Link2}
                  label="Connection"
                  tone={shiprocketState.status.configured ? "positive" : "warning"}
                  value={shiprocketState.status.configured ? "Configured" : "Not Configured"}
                />
                <StatCard
                  details={[
                    {
                      label: "Recent Failures",
                      value: formatNumber(countLogsByStatus(recentLogs, "failed"), "0"),
                    },
                  ]}
                  helper={formatDateTime(latestSync?.lastSyncedAt || latestSync?.createdAt)}
                  icon={Cloud}
                  label="Latest Sync"
                  tone={
                    latestSync?.status === "failed"
                      ? "danger"
                      : latestSync?.status === "partial"
                        ? "warning"
                        : "accent"
                  }
                  value={formatSyncStatus(latestSync?.status)}
                />
                <StatCard
                  details={[
                    {
                      label: "Recent Log Rows",
                      value: formatNumber(recentLogs.length, "0"),
                    },
                  ]}
                  helper="Read-only Shiprocket rows already imported into the dispatch ledger"
                  icon={RefreshCcw}
                  label="Synced Dispatch Rows"
                  tone="accent"
                  value={formatNumber(shiprocketState.status.syncedDispatchCount, "0")}
                />
              </section>

              <section className={dispatchStyles.panel}>
                <div className={dispatchStyles.panelHeader}>
                  <div>
                    <h3>Sync control</h3>
                    <p className={dispatchStyles.note}>
                      Shiprocket remains optional. If the API is unavailable, keep using the
                      manual dispatch form. Do not enter the same orders manually and via
                      Shiprocket sync.
                    </p>
                  </div>

                  <div className={dispatchStyles.actionRow}>
                    {canSyncShiprocket ? (
                      <button
                        className="primaryButton"
                        disabled={
                          shiprocketState.syncing || !shiprocketState.status.configured
                        }
                        onClick={() => void handleShiprocketSync()}
                        type="button"
                      >
                        {shiprocketState.syncing ? "Syncing..." : "Sync now"}
                      </button>
                    ) : (
                      <span className={dispatchStyles.readOnlyHint}>
                        Operators can review synced dispatches. Admins trigger sync.
                      </span>
                    )}
                  </div>
                </div>

                <div className={dispatchStyles.configGrid}>
                  <div className={dispatchStyles.configItem}>
                    <strong>Default lookback</strong>
                    <span>
                      {formatNumber(shiprocketState.status.defaults.lookbackDays, "0")} days
                    </span>
                  </div>
                  <div className={dispatchStyles.configItem}>
                    <strong>Max pages</strong>
                    <span>{formatNumber(shiprocketState.status.defaults.maxPages, "0")}</span>
                  </div>
                  <div className={dispatchStyles.configItem}>
                    <strong>Page size</strong>
                    <span>{formatNumber(shiprocketState.status.defaults.pageSize, "0")}</span>
                  </div>
                </div>

                {shiprocketState.error ? (
                  <div className={formStyles.bannerError}>{shiprocketState.error}</div>
                ) : null}
                {shiprocketState.success ? (
                  <div className={formStyles.bannerSuccess}>{shiprocketState.success}</div>
                ) : null}

                {!shiprocketState.status.configured ? (
                  <div className={dispatchStyles.inlineEmpty}>
                    <ShieldAlert size={18} />
                    <div>
                      <strong>Credentials still missing</strong>
                      <p>
                        Add the Shiprocket API email and password on the backend server,
                        then return here and run the first sync.
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className={dispatchStyles.panel}>
                <div className={dispatchStyles.panelHeader}>
                  <div>
                    <h3>Synced dispatch rows</h3>
                    <p className={dispatchStyles.note}>
                      These rows are read-only. They show what Shiprocket sync has already
                      imported into the dispatch ledger.
                    </p>
                  </div>
                </div>

                {shiprocketState.rows.length ? (
                  <DataTable
                    columns={[
                      {
                        header: "Date",
                        key: "entryDate",
                        render: (row) => formatDate(row.entryDate),
                      },
                      {
                        header: "Order ID",
                        key: "orderId",
                      },
                      {
                        header: "AWB",
                        key: "awb",
                        render: (row) => row.awb || "--",
                      },
                      {
                        header: "Product",
                        key: "productName",
                      },
                      {
                        align: "right",
                        header: "Qty",
                        key: "quantity",
                        render: (row) => formatNumber(row.quantity),
                      },
                      {
                        header: "Status",
                        key: "shiprocketStatus",
                        render: (row) => formatSyncStatus(row.shiprocketStatus),
                      },
                      {
                        header: "Synced",
                        key: "syncedAt",
                        render: (row) => formatDateTime(row.syncedAt),
                      },
                    ]}
                    rows={shiprocketState.rows}
                  />
                ) : (
                  <EmptyState
                    message="No Shiprocket rows have been imported yet. Once credentials are configured and a sync completes, the latest read-only dispatch rows will appear here."
                    title="No synced dispatches yet"
                  />
                )}
              </section>

              <section className={dispatchStyles.panel}>
                <div className={dispatchStyles.panelHeader}>
                  <div>
                    <h3>Recent sync log</h3>
                    <p className={dispatchStyles.note}>
                      Review the latest outcomes before trusting Shiprocket as a dispatch
                      convenience layer.
                    </p>
                  </div>
                </div>

                {recentLogs.length ? (
                  <DataTable
                    columns={[
                      {
                        header: "Created",
                        key: "createdAt",
                        render: (row) => formatDateTime(row.createdAt),
                      },
                      {
                        header: "Status",
                        key: "status",
                        render: (row) => formatSyncStatus(row.status),
                      },
                      {
                        align: "right",
                        header: "Rows Synced",
                        key: "recordsSynced",
                        render: (row) => formatNumber(row.recordsSynced),
                      },
                      {
                        header: "Last Synced",
                        key: "lastSyncedAt",
                        render: (row) => formatDateTime(row.lastSyncedAt),
                      },
                      {
                        header: "Notes",
                        key: "errorMessage",
                        render: (row) =>
                          row.errorMessage ||
                          `Fetched ${formatNumber(
                            row.metadata?.totalOrdersInRange || 0,
                            "0"
                          )} orders in range`,
                      },
                    ]}
                    rows={recentLogs}
                  />
                ) : (
                  <EmptyState
                    message="No sync has been run yet. Once an admin triggers Shiprocket sync, the last outcomes will appear here."
                    title="No sync log yet"
                  />
                )}
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Dispatch;
