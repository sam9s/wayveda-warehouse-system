import { useEffect, useState } from "react";
import { DataTable } from "../components/common/DataTable.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { PageHeader } from "../components/common/PageHeader.jsx";
import { ProductSelector } from "../components/common/ProductSelector.jsx";
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
  const [deleteTargetId, setDeleteTargetId] = useState("");
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

  useEffect(() => {
    if (deleteTargetId && !products.some((product) => product.id === deleteTargetId)) {
      setDeleteTargetId("");
      setDeleteState(EMPTY_DELETE_STATE);
    }
  }, [deleteTargetId, products]);

  if (state.loading) {
    return <LoadingSpinner label="Loading products" />;
  }

  if (state.error && !products.length && !form) {
    return <EmptyState message={state.error} title="Products unavailable" />;
  }

  const isCreating = selectedId === DRAFT_PRODUCT_ID;
  const isSystemAdmin = user?.role === "system_admin";
  const deleteTargetProduct =
    products.find((product) => product.id === deleteTargetId) || null;
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
    setSelectedId(productId);
  }

  function startCreateFlow() {
    resetMessages();
    setSelectedId(DRAFT_PRODUCT_ID);
    setForm(createEmptyProductForm(products));
  }

  function resetDeleteFlow() {
    setDeleteTargetId("");
    setDeleteState(EMPTY_DELETE_STATE);
  }

  function selectDeleteTarget(event) {
    setDeleteTargetId(event.target.value);
    setDeleteState(EMPTY_DELETE_STATE);
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
    if (!deleteTargetId || !isSystemAdmin) {
      return;
    }

    setDeleteState((currentState) => ({
      ...currentState,
      error: "",
      loading: true,
    }));

    try {
      const { data } = await api.get(`/products/${deleteTargetId}/delete-readiness`);
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
    if (!deleteTargetId || !isSystemAdmin || !deleteState.readiness?.canHardDelete) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${deleteTargetProduct?.name || "this product"}? This cannot be undone.`
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
      await api.delete(`/products/${deleteTargetId}/permanent`);
      const remainingProducts = sortProducts(
        products.filter((product) => product.id !== deleteTargetId)
      );
      setProducts(remainingProducts);

      if (selectedId === deleteTargetId) {
        const nextSelectedProduct = remainingProducts[0] || null;
        setSelectedId(nextSelectedProduct?.id || DRAFT_PRODUCT_ID);
        setForm(
          nextSelectedProduct
            ? normalizeProductForm(nextSelectedProduct)
            : createEmptyProductForm(remainingProducts)
        );
      } else if (selectedId === DRAFT_PRODUCT_ID) {
        setForm(createEmptyProductForm(remainingProducts));
      }

      setDeleteTargetId("");
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
                    className={
                      row.id === selectedId
                        ? `secondaryButton ${adminStyles.selectedProductButton}`
                        : "ghostButton"
                    }
                    onClick={() => selectExistingProduct(row.id)}
                    type="button"
                  >
                    <span className={adminStyles.selectedProductName}>{row.name}</span>
                    {row.id === selectedId ? (
                      <span className={adminStyles.selectedHint}>Selected</span>
                    ) : null}
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
                Use add, edit, deactivate, and reactivate for normal product lifecycle control.
              </p>
              {!isCreating && selectedProduct ? (
                <p className={adminStyles.selectionLabel}>
                  Selected product: <strong>{selectedProduct.name}</strong>
                </p>
              ) : null}
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
        </section>
      </div>

      {isSystemAdmin ? (
        <section className={`${adminStyles.card} ${adminStyles.dangerPanel}`}>
          <div className={adminStyles.sectionHeading}>
            <div>
              <h3>Permanent delete readiness</h3>
              <p className={adminStyles.note}>
                Reserved for <code>system_admin</code>. Select the exact product here, run
                the readiness check, and only then confirm permanent delete.
              </p>
            </div>
            <StatusPill value="System Admin Only" />
          </div>

          <div className={adminStyles.deleteControlRow}>
            <ProductSelector
              label="Product to delete"
              name="deleteTargetId"
              onChange={selectDeleteTarget}
              products={products}
              value={deleteTargetId}
            />

            <div className={adminStyles.toolbarActions}>
              <button
                className={`primaryButton ${adminStyles.dangerButton}`}
                disabled={!deleteTargetId || deleteState.loading || deleteState.working}
                onClick={handleDeleteReadinessCheck}
                type="button"
              >
                {deleteState.loading ? "Checking..." : "Run Delete Readiness Check"}
              </button>
              {deleteTargetId || deleteState.readiness || deleteState.error ? (
                <button
                  className="ghostButton"
                  disabled={deleteState.loading || deleteState.working}
                  onClick={resetDeleteFlow}
                  type="button"
                >
                  Reset
                </button>
              ) : null}
            </div>
          </div>

          {deleteTargetProduct ? (
            <p className={adminStyles.selectionLabel}>
              Delete target: <strong>{deleteTargetProduct.name}</strong>
            </p>
          ) : (
            <p className={adminStyles.note}>
              Choose a product in this danger card first. The delete check is product-specific
              and does not depend on the product selected for editing above.
            </p>
          )}

          {deleteState.error ? <div className={adminStyles.error}>{deleteState.error}</div> : null}

          {deleteState.readiness ? (
            <>
              <div className={adminStyles.statusGrid}>
                <div className={adminStyles.statusRow}>
                  <strong>Status</strong>
                  <span>
                    <StatusPill value={formatDeleteStatus(deleteState.readiness.status)} />
                  </span>
                </div>
                <div className={adminStyles.statusRow}>
                  <strong>Current balance</strong>
                  <span>{formatNumber(deleteState.readiness.summary.balance, "0")}</span>
                </div>
                <div className={adminStyles.statusRow}>
                  <strong>Movement rows</strong>
                  <span>{formatNumber(deleteState.readiness.summary.movementCount, "0")}</span>
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

              {deleteState.readiness.nextSteps?.length ? (
                <div className={adminStyles.nextStepCard}>
                  <strong>Next steps</strong>
                  <ul className={adminStyles.reasonList}>
                    {deleteState.readiness.nextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {deleteState.readiness.canHardDelete ? (
                <div className={adminStyles.actionCluster}>
                  <button
                    className={`primaryButton ${adminStyles.dangerButton}`}
                    disabled={deleteState.working}
                    onClick={handlePermanentDelete}
                    type="button"
                  >
                    {deleteState.working ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className={adminStyles.helperCard}>
              <strong>Safe test path</strong>
              <p>
                Create a zero-stock SKU, deactivate it, select it here, run the readiness
                check, and only then confirm permanent delete if the status is `Ready for
                delete`.
              </p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default ProductManagement;
