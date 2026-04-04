import { useState } from "react";
import api from "../../utils/api.js";
import { formatDateForInput } from "../../utils/formatters.js";
import { ProductSelector } from "../common/ProductSelector.jsx";
import formStyles from "./MovementForms.module.css";
import { MovementTypeCards } from "./MovementTypeCards.jsx";

function createEmptyLine() {
  return {
    cartons: "",
    productId: "",
    quantity: "",
  };
}

export function StockInForm({ currentUser, products }) {
  const [entryDate, setEntryDate] = useState(formatDateForInput());
  const [items, setItems] = useState([createEmptyLine()]);
  const [notes, setNotes] = useState("");
  const [state, setState] = useState({
    error: "",
    loading: false,
    success: "",
  });
  const [submittedBy, setSubmittedBy] = useState(
    currentUser?.appUser?.displayName || currentUser?.email || ""
  );

  function updateLine(index, field, value) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const nextItem = {
          ...item,
          [field]: value,
        };

        const selectedProduct = products.find(
          (product) => product.id === nextItem.productId
        );

        if ((field === "cartons" || field === "productId") && selectedProduct?.qtyPerCarton) {
          const cartons = Number(nextItem.cartons);
          if (Number.isFinite(cartons) && cartons > 0) {
            nextItem.quantity = String(cartons * Number(selectedProduct.qtyPerCarton));
          }
        }

        return nextItem;
      })
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setState({ error: "", loading: true, success: "" });

    try {
      const payload = {
        entryDate,
        items: items.map((item) => ({
          cartons: item.cartons ? Number(item.cartons) : null,
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
        notes,
        submittedBy,
      };

      const { data } = await api.post("/movements/stock-in", payload);
      setItems([createEmptyLine()]);
      setNotes("");
      setState({
        error: "",
        loading: false,
        success: `Stock In saved under submission ${data.submissionId}.`,
      });
    } catch (error) {
      setState({
        error: error.response?.data?.message || "Unable to save stock in.",
        loading: false,
        success: "",
      });
    }
  }

  return (
    <form className={formStyles.formShell} onSubmit={handleSubmit}>
      {state.error ? <div className={formStyles.bannerError}>{state.error}</div> : null}
      {state.success ? (
        <div className={formStyles.bannerSuccess}>{state.success}</div>
      ) : null}

      <section className={formStyles.section}>
        <div className={formStyles.sectionHeader}>
          <span className={formStyles.sectionNumber}>1</span>
          <div>
            <h3>Basic Info</h3>
            <p>Date and operator details.</p>
          </div>
        </div>

        <div className={formStyles.twoCol}>
          <label className={formStyles.field}>
            <span>Entry Date</span>
            <input
              onChange={(event) => setEntryDate(event.target.value)}
              type="date"
              value={entryDate}
            />
          </label>

          <label className={formStyles.field}>
            <span>Submitted By</span>
            <input
              onChange={(event) => setSubmittedBy(event.target.value)}
              placeholder="Operator name"
              value={submittedBy}
            />
          </label>
        </div>
      </section>

      <section className={formStyles.section}>
        <div className={formStyles.sectionHeader}>
          <span className={formStyles.sectionNumber}>2</span>
          <div>
            <h3>Entry Type</h3>
            <p>Preserve the familiar warehouse movement cards.</p>
          </div>
        </div>

        <MovementTypeCards />
      </section>

      <section className={formStyles.section}>
        <div className={formStyles.itemHeader}>
          <div className={formStyles.sectionHeader}>
            <span className={formStyles.sectionNumber}>3</span>
            <div>
              <h3>Products</h3>
              <p>Add one or more products for this submission.</p>
            </div>
          </div>
          <span className={formStyles.itemBadge}>{items.length}</span>
        </div>

        <div className={formStyles.lineList}>
          {items.map((item, index) => (
            <div className={formStyles.lineItem} key={`stock-in-${index}`}>
              <div className={formStyles.lineTop}>
                <strong>Product {index + 1}</strong>
                {items.length > 1 ? (
                  <button
                    className={formStyles.textLink}
                    onClick={() =>
                      setItems((currentItems) =>
                        currentItems.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className={formStyles.lineGrid}>
                <ProductSelector
                  onChange={(event) => updateLine(index, "productId", event.target.value)}
                  products={products}
                  value={item.productId}
                />
                <label className={formStyles.field}>
                  <span>Cartons</span>
                  <input
                    min="0"
                    onChange={(event) => updateLine(index, "cartons", event.target.value)}
                    type="number"
                    value={item.cartons}
                  />
                </label>
                <label className={formStyles.field}>
                  <span>Quantity</span>
                  <input
                    min="1"
                    onChange={(event) => updateLine(index, "quantity", event.target.value)}
                    type="number"
                    value={item.quantity}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className={formStyles.lineActions}>
          <button
            className="secondaryButton"
            onClick={() => setItems((currentItems) => [...currentItems, createEmptyLine()])}
            type="button"
          >
            + Add Product
          </button>
        </div>
      </section>

      <section className={formStyles.section}>
        <div className={formStyles.sectionHeader}>
          <span className={formStyles.sectionNumber}>4</span>
          <div>
            <h3>Remarks</h3>
            <p>Optional notes for the warehouse record.</p>
          </div>
        </div>

        <label className={formStyles.field}>
          <span>Remarks</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Supplier, batch details, or handling notes"
            value={notes}
          />
        </label>
      </section>

      <div className={formStyles.formActions}>
        <span className={formStyles.supportText}>
          Quantity auto-fills from cartons when `qty_per_carton` is available.
        </span>
        <button
          className={`primaryButton ${formStyles.submitStockIn}`}
          disabled={state.loading}
          type="submit"
        >
          {state.loading ? "Saving..." : "Submit Stock In"}
        </button>
      </div>
    </form>
  );
}
