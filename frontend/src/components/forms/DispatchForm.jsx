import { useState } from "react";
import api from "../../utils/api.js";
import { formatDateForInput } from "../../utils/formatters.js";
import { ProductSelector } from "../common/ProductSelector.jsx";
import formStyles from "./MovementForms.module.css";
import { MovementTypeCards } from "./MovementTypeCards.jsx";

function createEmptyLine() {
  return {
    productId: "",
    quantity: "",
  };
}

export function DispatchForm({ currentUser, products }) {
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
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setState({ error: "", loading: true, success: "" });

    try {
      const payload = {
        entryDate,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
        notes,
        submittedBy,
      };

      const { data } = await api.post("/movements/dispatch", payload);
      setItems([createEmptyLine()]);
      setNotes("");
      setState({
        error: "",
        loading: false,
        success: `Dispatch saved under submission ${data.submissionId}.`,
      });
    } catch (error) {
      setState({
        error: error.response?.data?.message || "Unable to save dispatch.",
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
            <p>Use the same movement card language as the old workflow.</p>
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
              <p>Record one or more manually dispatched products.</p>
            </div>
          </div>
          <span className={formStyles.itemBadge}>{items.length}</span>
        </div>

        <div className={formStyles.lineList}>
          {items.map((item, index) => (
            <div className={formStyles.lineItem} key={`dispatch-${index}`}>
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
            <p>Optional notes for exceptional handling or references.</p>
          </div>
        </div>

        <label className={formStyles.field}>
          <span>Remarks</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Courier note, manual override, or order reference"
            value={notes}
          />
        </label>
      </section>

      <div className={formStyles.formActions}>
        <span className={formStyles.supportText}>
          Manual dispatch remains available even before Shiprocket is connected.
        </span>
        <button
          className={`primaryButton ${formStyles.submitDispatch}`}
          disabled={state.loading}
          type="submit"
        >
          {state.loading ? "Saving..." : "Submit Dispatch"}
        </button>
      </div>
    </form>
  );
}
