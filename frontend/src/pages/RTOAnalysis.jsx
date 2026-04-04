import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { DataTable } from "../components/common/DataTable.jsx";
import { DateRangePicker } from "../components/common/DateRangePicker.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { PeriodToggle } from "../components/common/PeriodToggle.jsx";
import { ProductSelector } from "../components/common/ProductSelector.jsx";
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

function RTOAnalysis() {
  const { error: productError, loading: productsLoading, products } = useProducts();
  const [filters, setFilters] = useState({
    from: defaultFromDate(),
    period: "monthly",
    productId: "",
    to: formatDateForInput(),
  });
  const [state, setState] = useState({
    error: "",
    loading: true,
    rows: [],
  });

  useEffect(() => {
    let isCancelled = false;

    api
      .get("/inventory/rto-analysis", {
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
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setState({
          error: error.response?.data?.message || "Unable to load RTO analysis.",
          loading: false,
          rows: [],
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
    const existing = totals.get(row.period_label) || { fake: 0, right: 0, wrong: 0 };
    totals.set(row.period_label, {
      fake: existing.fake + Number(row.total_fake || 0),
      right: existing.right + Number(row.total_right || 0),
      wrong: existing.wrong + Number(row.total_wrong || 0),
    });
    return totals;
  }, new Map());

  const labels = Array.from(chartPoints.keys());
  const chartData = {
    datasets: [
      {
        backgroundColor: "rgba(0, 191, 166, 0.72)",
        data: labels.map((label) => chartPoints.get(label)?.right || 0),
        label: "RTO Right",
      },
      {
        backgroundColor: "rgba(29, 90, 138, 0.72)",
        data: labels.map((label) => chartPoints.get(label)?.wrong || 0),
        label: "RTO Wrong",
      },
      {
        backgroundColor: "rgba(223, 94, 66, 0.72)",
        data: labels.map((label) => chartPoints.get(label)?.fake || 0),
        label: "RTO Fake",
      },
    ],
    labels,
  };

  return (
    <div className={analysisStyles.page}>
      <PageHeader
        description="Review recovered stock versus warehouse fault and fake returns over time."
        eyebrow="Analysis"
        title="RTO Analysis"
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
        <LoadingSpinner label="Refreshing RTO analysis" />
      ) : (
        <>
          <section className={analysisStyles.chartCard}>
            <h3>RTO quality by period</h3>
            <div className={analysisStyles.chartWrap}>
              <Bar data={chartData} />
            </div>
          </section>

          <section className={analysisStyles.tableCard}>
            <h3>RTO records</h3>
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
                  header: "Right",
                  key: "total_right",
                  render: (row) => formatNumber(row.total_right),
                },
                {
                  align: "right",
                  header: "Wrong",
                  key: "total_wrong",
                  render: (row) => formatNumber(row.total_wrong),
                },
                {
                  align: "right",
                  header: "Fake",
                  key: "total_fake",
                  render: (row) => formatNumber(row.total_fake),
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

export default RTOAnalysis;
