import { useEffect, useState } from "react";
import { DataTable } from "../components/common/DataTable.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import api from "../utils/api.js";
import { formatNumber } from "../utils/formatters.js";
import adminStyles from "./Admin.module.css";

function normalizeProductForm(product) {
  return {
    category: product.category || "",
    displayOrder: product.displayOrder ?? "",
    isActive: Boolean(product.isActive),
    maxLevel: product.maxLevel ?? "",
    name: product.name || "",
    openingStock: product.openingStock ?? "",
    qtyPerCarton: product.qtyPerCarton ?? "",
    sku: product.sku || "",
    unit: product.unit || "pcs",
  };
}

function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(null);
  const [state, setState] = useState({
    error: "",
    loading: true,
    success: "",
  });

  useEffect(() => {
    let isCancelled = false;

    api
      .get("/products?includeInactive=true")
      .then(({ data }) => {
        if (isCancelled) {
          return;
        }

        const nextProducts = data.products || [];
        setProducts(nextProducts);
        setSelectedId(nextProducts[0]?.id || "");
        setForm(nextProducts[0] ? normalizeProductForm(nextProducts[0]) : null);
        setState({
          error: "",
          loading: false,
          success: "",
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setState({
          error: error.response?.data?.message || "Unable to load products.",
          loading: false,
          success: "",
        });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const product = products.find((item) => item.id === selectedId);
    setForm(product ? normalizeProductForm(product) : null);
  }, [products, selectedId]);

  if (state.loading) {
    return <LoadingSpinner label="Loading products" />;
  }

  if (state.error) {
    return <EmptyState message={state.error} title="Products unavailable" />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setState((currentState) => ({ ...currentState, error: "", success: "" }));

    try {
      const payload = {
        category: form.category || null,
        displayOrder: form.displayOrder === "" ? null : Number(form.displayOrder),
        isActive: Boolean(form.isActive),
        maxLevel: form.maxLevel === "" ? null : Number(form.maxLevel),
        name: form.name,
        openingStock: form.openingStock === "" ? null : Number(form.openingStock),
        qtyPerCarton: form.qtyPerCarton === "" ? null : Number(form.qtyPerCarton),
        sku: form.sku || null,
        unit: form.unit || "pcs",
      };

      const { data } = await api.put(`/products/${selectedId}`, payload);
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === selectedId ? data.product : product
        )
      );
      setState((currentState) => ({
        ...currentState,
        success: "Product updated successfully.",
      }));
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error: error.response?.data?.message || "Unable to update product.",
      }));
    }
  }

  return (
    <div className={adminStyles.page}>
      <PageHeader
        description="Update product metadata, carton defaults, and reorder settings as client inputs arrive."
        eyebrow="Admin"
        title="Product Management"
      />

      <div className={adminStyles.grid}>
        <section className={adminStyles.card}>
          <div className={adminStyles.toolbar}>
            <div>
              <h3>Product list</h3>
              <p className={adminStyles.note}>
                All 12 canonical products are already seeded from Phase B.
              </p>
            </div>
          </div>

          <DataTable
            columns={[
              {
                header: "Product",
                key: "name",
                render: (row) => (
                  <button
                    className="ghostButton"
                    onClick={() => setSelectedId(row.id)}
                    type="button"
                  >
                    {row.name}
                  </button>
                ),
              },
              {
                header: "SKU",
                key: "sku",
                render: (row) => row.sku || "--",
              },
              {
                align: "right",
                header: "Max Level",
                key: "maxLevel",
                render: (row) => formatNumber(row.maxLevel),
              },
              {
                align: "right",
                header: "Qty/Carton",
                key: "qtyPerCarton",
                render: (row) => formatNumber(row.qtyPerCarton),
              },
            ]}
            rows={products}
          />
        </section>

        <section className={adminStyles.card}>
          <h3>Edit selected product</h3>
          {state.error ? <div className={adminStyles.error}>{state.error}</div> : null}
          {state.success ? <div className={adminStyles.success}>{state.success}</div> : null}

          {form ? (
            <form className={adminStyles.stack} onSubmit={handleSubmit}>
              <label className={adminStyles.field}>
                <span>Name</span>
                <input
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  value={form.name}
                />
              </label>
              <label className={adminStyles.field}>
                <span>Category</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                  value={form.category}
                />
              </label>
              <label className={adminStyles.field}>
                <span>SKU</span>
                <input
                  onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
                  value={form.sku}
                />
              </label>
              <label className={adminStyles.field}>
                <span>Max Level</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, maxLevel: event.target.value }))
                  }
                  type="number"
                  value={form.maxLevel}
                />
              </label>
              <label className={adminStyles.field}>
                <span>Qty Per Carton</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      qtyPerCarton: event.target.value,
                    }))
                  }
                  type="number"
                  value={form.qtyPerCarton}
                />
              </label>
              <label className={adminStyles.field}>
                <span>Opening Stock</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      openingStock: event.target.value,
                    }))
                  }
                  type="number"
                  value={form.openingStock}
                />
              </label>
              <label className={adminStyles.field}>
                <span>Display Order</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      displayOrder: event.target.value,
                    }))
                  }
                  type="number"
                  value={form.displayOrder}
                />
              </label>
              <label className={adminStyles.field}>
                <span>Unit</span>
                <input
                  onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                  value={form.unit}
                />
              </label>
              <label className={adminStyles.field}>
                <span>Status</span>
                <select
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.value === "true",
                    }))
                  }
                  value={String(form.isActive)}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>

              <button className="primaryButton" type="submit">
                Save Product
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default ProductManagement;
