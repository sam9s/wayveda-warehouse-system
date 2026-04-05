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
  last30Days: { quantity: 0 },
  last7Days: { quantity: 0 },
  today: { quantity: 0 },
};

function DispatchAnalysis() {
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
      .get("/inventory/dispatch-analysis", {
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
          error: error.response?.data?.message || "Unable to load dispatch analysis.",
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
    return <LoadingSpinner label="Loading analysis" />;
  }

  if (productError) {
    return <EmptyState message={productError} title="Analysis unavailable" />;
  }

  const chartPoints = state.rows.reduce((totals, row) => {
    const existing = totals.get(row.period_label) || 0;
    totals.set(row.period_label, existing + Number(row.quantity || 0));
    return totals;
  }, new Map());

  const chartData = {
    datasets: [
      {
        backgroundColor: "rgba(29, 90, 138, 0.18)",
        borderColor: "#1d5a8a",
        data: Array.from(chartPoints.values()),
        fill: true,
        label: "Dispatch quantity",
        tension: 0.28,
      },
    ],
    labels: Array.from(chartPoints.keys()),
  };

  return (
    <div className={analysisStyles.page}>
      <PageHeader
        description="Dispatch trend lines for manual and future synced movement history."
        eyebrow="Analysis"
        title="Dispatch Analysis"
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
        <LoadingSpinner label="Refreshing dispatch analysis" />
      ) : (
        <>
          <section className={analysisStyles.summaryGrid}>
            <StatCard
              helper="Confirmed dispatch quantity for today only"
              icon={Clock3}
              label="Dispatched Today"
              tone="accent"
              value={formatNumber(state.summary.today.quantity)}
            />
            <StatCard
              helper="Rolling total including today"
              icon={CalendarRange}
              label="Last 7 Days"
              tone="accent"
              value={formatNumber(state.summary.last7Days.quantity)}
            />
            <StatCard
              helper="Rolling monthly dispatch volume ending today"
              icon={CalendarDays}
              label="Last 30 Days"
              tone="accent"
              value={formatNumber(state.summary.last30Days.quantity)}
            />
          </section>

          <p className={analysisStyles.summaryNote}>
            Rolling totals always end on today and respect the selected product filter.
            The chart date range and daily/weekly/monthly toggle remain separate trend
            controls.
          </p>

          <section className={analysisStyles.chartCard}>
            <h3>Dispatch quantity by period</h3>
            <div className={analysisStyles.chartWrap}>
              <Line data={chartData} />
            </div>
          </section>

          <section className={analysisStyles.tableCard}>
            <h3>Dispatch records</h3>
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
              ]}
              rows={state.rows}
            />
          </section>
        </>
      )}
    </div>
  );
}

export default DispatchAnalysis;
