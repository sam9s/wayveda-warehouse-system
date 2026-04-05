import { useEffect, useState } from "react";
import { DataTable } from "../components/common/DataTable.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { StatusPill } from "../components/common/StatusPill.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import api from "../utils/api.js";
import { formatDateForInput, formatNumber } from "../utils/formatters.js";
import adminStyles from "./Admin.module.css";

const DRAFT_PRODUCT_ID = "__new__";
const EMPTY_DELETE_STATE = {
  error: "",
  loading: false,
  readiness: null,
  working: false,
};

function sortProducts(products) {
  return [...products].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    const leftOrder = Number(left.displayOrder ?? 0);
    const rightOrder = Number(right.displayOrder ?? 0);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

function normalizeDate(value) {
  return value ? formatDateForInput(value) : formatDateForInput();
}

function createEmptyProductForm(products = []) {
  const nextDisplayOrder = products.reduce((highest, product) => {
    const displayOrder = Number(product.displayOrder ?? 0);
    return Number.isFinite(displayOrder) ? Math.max(highest, displayOrder) : highest;
  }, -1);

  return {
    category: "",
    displayOrder: String(Math.max(nextDisplayOrder + 1, 0)),
    isActive: true,
    maxLevel: "",
    name: "",
    openingStock: 0,
    openingStockDate: formatDateForInput(),
    qtyPerCarton: "",
    sku: "",
    unit: "pcs",
  };
}

function normalizeProductForm(product) {
  return {
    category: product.category || "",
    displayOrder: product.displayOrder ?? "",
    isActive: Boolean(product.isActive),
    maxLevel: product.maxLevel ?? "",
    name: product.name || "",
    openingStock: product.openingStock ?? 0,
    openingStockDate: normalizeDate(product.openingStockDate),
    qtyPerCarton: product.qtyPerCarton ?? "",
    sku: product.sku || "",
    unit: product.unit || "pcs",
  };
}

function formatDeleteStatus(status) {
  switch (status) {
    case "safe":
      return "Ready for delete";
    case "guided_cleanup_required":
      return "Guided cleanup required";
    case "blocked":
      return "Blocked";
    default:
      return "Not checked";
  }
}

function ProductManagement() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(null);
  const [deleteState, setDeleteState] = useState(EMPTY_DELETE_STATE);
  const [state, setState] = useState({
    error: "",
    loading: true,
    success: "",
    working: false,
  });

  useEffect(() => {
    let isCancelled = false;

    api
      .get("/products?includeInactive=true")
      .then(({ data }) => {
        if (isCancelled) {
          return;
        }

        const nextProducts = sortProducts(data.products || []);
        const nextSelectedId = nextProducts[0]?.id || DRAFT_PRODUCT_ID;
        setProducts(nextProducts);
        setSelectedId(nextSelectedId);
        setForm(
          nextSelectedId === DRAFT_PRODUCT_ID
            ? createEmptyProductForm(nextProducts)
            : normalizeProductForm(nextProducts[0])
        );
        setState({
          error: "",
          loading: false,
          success: "",
          working: false,
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
          working: false,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedId === DRAFT_PRODUCT_ID) {
      if (!form) {
        setForm(createEmptyProductForm(products));
      }

      return;
    }

    const product = products.find((item) => item.id === selectedId);
    setForm(product ? normalizeProductForm(product) : null);
  }, [products, selectedId]);

  if (state.loading) {
    return <LoadingSpinner label="Loading products" />;
  }

  if (state.error && !products.length && !form) {
    return <EmptyState message={state.error} title="Products unavailable" />;
  }

  const isCreating = selectedId === DRAFT_PRODUCT_ID;
  const isSystemAdmin = user?.role === "system_admin";
  const selectedProduct = isCreating
    ? null
    : products.find((product) => product.id === selectedId) || null;

  function resetMessages() {
    setState((currentState) => ({
      ...currentState,
      error: "",
      success: "",
    }));
  }

  function selectExistingProduct(productId) {
    resetMessages();
    setDeleteState(EMPTY_DELETE_STATE);
    setSelectedId(productId);
  }

  function startCreateFlow() {
    resetMessages();
    setDeleteState(EMPTY_DELETE_STATE);
    setSelectedId(DRAFT_PRODUCT_ID);
    setForm(createEmptyProductForm(products));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setState((currentState) => ({
      ...currentState,
      error: "",
      success: "",
      working: true,
    }));

    try {
      const payload = {
        category: form.category || null,
        displayOrder: form.displayOrder === "" ? null : Number(form.displayOrder),
        isActive: Boolean(form.isActive),
        maxLevel: form.maxLevel === "" ? null : Number(form.maxLevel),
        name: form.name.trim(),
        openingStock: form.openingStock === "" ? null : Number(form.openingStock),
        openingStockDate: form.openingStockDate || null,
        qtyPerCarton: form.qtyPerCarton === "" ? null : Number(form.qtyPerCarton),
        sku: form.sku || null,
        unit: form.unit || "pcs",
      };

      if (isCreating) {
        const { data } = await api.post("/products", payload);
        const nextProducts = sortProducts([...products, data.product]);
        setProducts(nextProducts);
        setSelectedId(data.product.id);
        setForm(normalizeProductForm(data.product));
        setDeleteState(EMPTY_DELETE_STATE);
        setState({
          error: "",
          loading: false,
          success: "Product created successfully.",
          working: false,
        });
        return;
      }

      const { data } = await api.put(`/products/${selectedId}`, payload);
      const nextProducts = sortProducts(
        products.map((product) => (product.id === selectedId ? data.product : product))
      );
      setProducts(nextProducts);
      setForm(normalizeProductForm(data.product));
      setDeleteState(EMPTY_DELETE_STATE);
      setState({
        error: "",
        loading: false,
        success: "Product updated successfully.",
        working: false,
      });
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error: error.response?.data?.message || "Unable to save product.",
        working: false,
      }));
    }
  }

  async function handleDeactivate() {
    if (!selectedId || isCreating) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      error: "",
      success: "",
      working: true,
    }));

    try {
      const { data } = await api.delete(`/products/${selectedId}`);
      const nextProducts = sortProducts(
        products.map((product) => (product.id === selectedId ? data.product : product))
      );
      setProducts(nextProducts);
      setForm(normalizeProductForm(data.product));
      setDeleteState(EMPTY_DELETE_STATE);
      setState({
        error: "",
        loading: false,
        success: "Product deactivated successfully.",
        working: false,
      });
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error: error.response?.data?.message || "Unable to deactivate product.",
        working: false,
      }));
    }
  }

  async function handleReactivate() {
    if (!selectedId || isCreating) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      error: "",
      success: "",
      working: true,
    }));

    try {
      const { data } = await api.put(`/products/${selectedId}`, {
        isActive: true,
      });
      const nextProducts = sortProducts(
        products.map((product) => (product.id === selectedId ? data.product : product))
      );
      setProducts(nextProducts);
      setForm(normalizeProductForm(data.product));
      setDeleteState(EMPTY_DELETE_STATE);
      setState({
        error: "",
        loading: false,
        success: "Product reactivated successfully.",
        working: false,
      });
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error: error.response?.data?.message || "Unable to reactivate product.",
        working: false,
      }));
    }
  }

  async function handleDeleteReadinessCheck() {
    if (!selectedId || isCreating || !isSystemAdmin) {
      return;
    }

    setDeleteState((currentState) => ({
      ...currentState,
      error: "",
      loading: true,
    }));

    try {
      const { data } = await api.get(`/products/${selectedId}/delete-readiness`);
      setDeleteState({
        error: "",
        loading: false,
        readiness: data.readiness,
        working: false,
      });
    } catch (error) {
      setDeleteState({
        error:
          error.response?.data?.error?.message || "Unable to run delete readiness check.",
        loading: false,
        readiness: error.response?.data?.error?.details || null,
        working: false,
      });
    }
  }

  async function handlePermanentDelete() {
    if (!selectedId || isCreating || !isSystemAdmin || !deleteState.readiness?.canHardDelete) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${selectedProduct?.name || "this product"}? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setDeleteState((currentState) => ({
      ...currentState,
      error: "",
      working: true,
    }));

    try {
      await api.delete(`/products/${selectedId}/permanent`);
      const remainingProducts = sortProducts(
        products.filter((product) => product.id !== selectedId)
      );
      const nextSelectedProduct = remainingProducts[0] || null;

      setProducts(remainingProducts);
      setSelectedId(nextSelectedProduct?.id || DRAFT_PRODUCT_ID);
      setForm(
        nextSelectedProduct
          ? normalizeProductForm(nextSelectedProduct)
          : createEmptyProductForm(remainingProducts)
      );
      setDeleteState(EMPTY_DELETE_STATE);
      setState({
        error: "",
        loading: false,
        success: "Product permanently deleted.",
        working: false,
      });
    } catch (error) {
      setDeleteState({
        error:
          error.response?.data?.error?.message || "Unable to delete product permanently.",
        loading: false,
        readiness: error.response?.data?.error?.details || deleteState.readiness,
        working: false,
      });
    }
  }

  return (
    <div className={adminStyles.page}>
      <PageHeader
        description="Create new products, maintain carton defaults, and safely deactivate inactive SKUs without breaking inventory history."
        eyebrow="Admin"
        title="Product Management"
      />

      <div className={adminStyles.grid}>
        <section className={adminStyles.card}>
          <div className={adminStyles.toolbar}>
            <div>
              <h3>Product list</h3>
              <p className={adminStyles.note}>
                Canonical products stay in history. Deactivation hides a SKU from new entry
                flows without erasing past movements.
              </p>
            </div>
            <div className={adminStyles.toolbarActions}>
              <button className="primaryButton" onClick={startCreateFlow} type="button">
                Add Product
              </button>
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
                    onClick={() => selectExistingProduct(row.id)}
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
                header: "Status",
                key: "isActive",
                render: (row) => <StatusPill value={row.isActive ? "Active" : "Inactive"} />,
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
          <div className={adminStyles.sectionHeading}>
            <div>
              <h3>{isCreating ? "Add product" : "Edit selected product"}</h3>
              <p className={adminStyles.note}>
                Permanent delete is guarded behind a system-admin readiness check. Use
                deactivate/reactivate for normal lifecycle control.
              </p>
            </div>
            {!isCreating && selectedProduct ? (
              <StatusPill value={selectedProduct.isActive ? "Active" : "Inactive"} />
            ) : null}
          </div>

          {state.error ? <div className={adminStyles.error}>{state.error}</div> : null}
          {state.success ? <div className={adminStyles.success}>{state.success}</div> : null}

          {form ? (
            <form className={adminStyles.stack} onSubmit={handleSubmit}>
              <label className={adminStyles.field}>
                <span>Name</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
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
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sku: event.target.value }))
                  }
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
                <span>Opening Stock Date</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      openingStockDate: event.target.value,
                    }))
                  }
                  type="date"
                  value={form.openingStockDate}
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
                  onChange={(event) =>
                    setForm((current) => ({ ...current, unit: event.target.value }))
                  }
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

              <div className={adminStyles.actionCluster}>
                <button className="primaryButton" disabled={state.working} type="submit">
                  {state.working
                    ? "Saving..."
                    : isCreating
                      ? "Create Product"
                      : "Save Product"}
                </button>
                {!isCreating && selectedProduct?.isActive ? (
                  <button
                    className="secondaryButton"
                    disabled={state.working}
                    onClick={handleDeactivate}
                    type="button"
                  >
                    Deactivate Product
                  </button>
                ) : null}
                {!isCreating && selectedProduct && !selectedProduct.isActive ? (
                  <button
                    className="secondaryButton"
                    disabled={state.working}
                    onClick={handleReactivate}
                    type="button"
                  >
                    Reactivate Product
                  </button>
                ) : null}
                {isCreating ? (
                  <button
                    className="ghostButton"
                    disabled={state.working}
                    onClick={() => {
                      const firstProduct = products[0];
                      if (firstProduct) {
                        selectExistingProduct(firstProduct.id);
                        return;
                      }

                      setForm(createEmptyProductForm(products));
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}

          {isSystemAdmin && !isCreating && selectedProduct ? (
            <div className={adminStyles.helperCard}>
              <div className={adminStyles.toolbar}>
                <div>
                  <strong>Permanent delete readiness</strong>
                  <p className={adminStyles.note}>
                    Reserved for <code>system_admin</code>. Run the check before any permanent
                    delete attempt.
                  </p>
                </div>
                <div className={adminStyles.toolbarActions}>
                  <button
                    className="secondaryButton"
                    disabled={deleteState.loading || deleteState.working}
                    onClick={handleDeleteReadinessCheck}
                    type="button"
                  >
                    {deleteState.loading ? "Checking..." : "Run Delete Readiness Check"}
                  </button>
                </div>
              </div>

              {deleteState.error ? (
                <div className={adminStyles.error}>{deleteState.error}</div>
              ) : null}

              {deleteState.readiness ? (
                <>
                  <div className={adminStyles.statusGrid}>
                    <div className={adminStyles.statusRow}>
                      <strong>Status</strong>
                      <span>
                        <StatusPill
                          value={formatDeleteStatus(deleteState.readiness.status)}
                        />
                      </span>
                    </div>
                    <div className={adminStyles.statusRow}>
                      <strong>Current balance</strong>
                      <span>{formatNumber(deleteState.readiness.summary.balance, "0")}</span>
                    </div>
                    <div className={adminStyles.statusRow}>
                      <strong>Movement rows</strong>
                      <span>
                        {formatNumber(deleteState.readiness.summary.movementCount, "0")}
                      </span>
                    </div>
                    <div className={adminStyles.statusRow}>
                      <strong>Rule summary</strong>
                      <span>{deleteState.readiness.guidance}</span>
                    </div>
                  </div>

                  <div className={adminStyles.checkList}>
                    {deleteState.readiness.checks.map((check) => (
                      <div className={adminStyles.checkRow} key={check.key}>
                        <strong>{check.label}</strong>
                        <span>{check.passed ? "Pass" : "Fail"}</span>
                      </div>
                    ))}
                  </div>

                  {deleteState.readiness.reasons?.length ? (
                    <ul className={adminStyles.reasonList}>
                      {deleteState.readiness.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}

                  {deleteState.readiness.canHardDelete ? (
                    <div className={adminStyles.actionCluster}>
                      <button
                        className="primaryButton"
                        disabled={deleteState.working}
                        onClick={handlePermanentDelete}
                        type="button"
                      >
                        {deleteState.working
                          ? "Deleting..."
                          : "Delete Product Permanently"}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className={adminStyles.note}>
                  Best test path: create a zero-stock SKU, deactivate it, run the readiness
                  check, then confirm permanent delete.
                </p>
              )}
            </div>
          ) : (
            <div className={adminStyles.helperCard}>
              <strong>Permanent delete rule</strong>
              <p>
                Permanent delete is reserved for <code>system_admin</code> and only after a
                readiness check confirms the SKU is inactive, has zero balance, and has no
                movement history.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ProductManagement;
