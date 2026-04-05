import { CalendarDays, CalendarRange, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { DataTable } from "../components/common/DataTable.jsx";
import { DateRangePicker } from "../components/common/DateRangePicker.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { PeriodToggle } from "../components/common/PeriodToggle.jsx";
import { ProductSelector } from "../components/common/ProductSelector.jsx";
import { StatCard } from "../components/common/StatCard.jsx";
import { useProducts } from "../hooks/useProducts.js";
import api from "../utils/api.js";
import {
  formatDate,
  formatDateForInput,
  formatNumber,
} from "../utils/formatters.js";
import analysisStyles from "./Analysis.module.css";

function defaultFromDate() {
  const date = new Date();
  date.setDate(date.getDate() - 60);
  return formatDateForInput(date);
}

const EMPTY_SUMMARY = {
  last30Days: { cartons: 0, quantity: 0 },
  last7Days: { cartons: 0, quantity: 0 },
  today: { cartons: 0, quantity: 0 },
};

function InwardAnalysis() {
  const { error: productError, loading: productsLoading, products } = useProducts();
  const [filters, setFilters] = useState({
    from: defaultFromDate(),
    period: "daily",
    productId: "",
    to: formatDateForInput(),
  });
  const [state, setState] = useState({
    error: "",
    loading: true,
    rows: [],
    summary: EMPTY_SUMMARY,
  });

  useEffect(() => {
    let isCancelled = false;

    api
      .get("/inventory/inward-analysis", {
        params: {
          from: filters.from,
          period: filters.period,
          productId: filters.productId || undefined,
          to: filters.to,
        },
      })
      .then(({ data }) => {
        if (isCancelled) {
          return;
        }

        setState({
          error: "",
          loading: false,
          rows: data.rows || [],
          summary: data.summary || EMPTY_SUMMARY,
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setState({
          error: error.response?.data?.message || "Unable to load stock in analysis.",
          loading: false,
          rows: [],
          summary: EMPTY_SUMMARY,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [filters]);

  if (productsLoading) {
    return <LoadingSpinner label="Loading stock in analysis" />;
  }

  if (productError) {
    return <EmptyState message={productError} title="Analysis unavailable" />;
  }

  const chartPoints = state.rows.reduce((totals, row) => {
    const existing = totals.get(row.period_label) || { cartons: 0, quantity: 0 };
    totals.set(row.period_label, {
      cartons: existing.cartons + Number(row.cartons || 0),
      quantity: existing.quantity + Number(row.quantity || 0),
    });
    return totals;
  }, new Map());

  const labels = Array.from(chartPoints.keys());
  const chartData = {
    datasets: [
      {
        backgroundColor: "rgba(0, 191, 166, 0.18)",
        borderColor: "#0f7c72",
        data: labels.map((label) => chartPoints.get(label)?.quantity || 0),
        fill: true,
        label: "Quantity received",
        tension: 0.28,
      },
      {
        backgroundColor: "rgba(29, 90, 138, 0.14)",
        borderColor: "#1d5a8a",
        data: labels.map((label) => chartPoints.get(label)?.cartons || 0),
        fill: false,
        label: "Cartons received",
        tension: 0.22,
      },
    ],
    labels,
  };

  return (
    <div className={analysisStyles.page}>
      <PageHeader
        description="Monitor stock-in trends by quantity and cartons received."
        eyebrow="Analysis"
        title="Stock In Analysis"
      />

      <section className={analysisStyles.toolbarCard}>
        <div className={analysisStyles.toolbar}>
          <div className={analysisStyles.toolbarGroup}>
            <DateRangePicker
              from={filters.from}
              onChange={(nextRange) => setFilters((current) => ({ ...current, ...nextRange }))}
              to={filters.to}
            />
            <ProductSelector
              label="Product Filter"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  productId: event.target.value,
                }))
              }
              products={products}
              value={filters.productId}
            />
          </div>

          <PeriodToggle
            onChange={(period) => setFilters((current) => ({ ...current, period }))}
            value={filters.period}
          />
        </div>
      </section>

      {state.loading ? (
        <LoadingSpinner label="Refreshing stock in analysis" />
      ) : (
        <>
          <section className={analysisStyles.summaryGrid}>
            <StatCard
              details={[
                {
                  label: "Cartons",
                  value: formatNumber(state.summary.today.cartons),
                },
              ]}
              helper="Received today only"
              icon={Clock3}
              label="Stock In Today"
              tone="positive"
              value={formatNumber(state.summary.today.quantity)}
            />
            <StatCard
              details={[
                {
                  label: "Cartons",
                  value: formatNumber(state.summary.last7Days.cartons),
                },
              ]}
              helper="Rolling 7-day stock-in quantity"
              icon={CalendarRange}
              label="Last 7 Days"
              tone="positive"
              value={formatNumber(state.summary.last7Days.quantity)}
            />
            <StatCard
              details={[
                {
                  label: "Cartons",
                  value: formatNumber(state.summary.last30Days.cartons),
                },
              ]}
              helper="Rolling 30-day stock-in quantity"
              icon={CalendarDays}
              label="Last 30 Days"
              tone="positive"
              value={formatNumber(state.summary.last30Days.quantity)}
            />
          </section>

          <p className={analysisStyles.summaryNote}>
            Rolling totals always end on today and respect the selected product filter.
            Quantity is primary; cartons stay visible for warehouse traceability.
          </p>

          <section className={analysisStyles.chartCard}>
            <h3>Stock in trend by period</h3>
            <div className={analysisStyles.chartWrap}>
              <Line data={chartData} />
            </div>
          </section>

          <section className={analysisStyles.tableCard}>
            <h3>Stock in records</h3>
            <DataTable
              columns={[
                {
                  header: "Period",
                  key: "period_label",
                  render: (row) => formatDate(row.period_start, row.period_label),
                },
                {
                  header: "Product",
                  key: "product_name",
                },
                {
                  align: "right",
                  header: "Quantity",
                  key: "quantity",
                  render: (row) => formatNumber(row.quantity),
                },
                {
                  align: "right",
                  header: "Cartons",
                  key: "cartons",
                  render: (row) => formatNumber(row.cartons),
                },
              ]}
              rows={state.rows}
            />
          </section>
        </>
      )}
    </div>
  );
}

export default InwardAnalysis;
