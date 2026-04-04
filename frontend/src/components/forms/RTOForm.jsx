import { useState } from "react";
import api from "../../utils/api.js";
import { formatDateForInput } from "../../utils/formatters.js";
import { ProductSelector } from "../common/ProductSelector.jsx";
import formStyles from "./MovementForms.module.css";
import { MovementTypeCards } from "./MovementTypeCards.jsx";

function createEmptyLine() {
  return {
    productId: "",
    rtoFake: "",
    rtoRight: "",
    rtoWrong: "",
  };
}

export function RTOForm({ currentUser, products }) {
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
          rtoFake: Number(item.rtoFake || 0),
          rtoRight: Number(item.rtoRight || 0),
          rtoWrong: Number(item.rtoWrong || 0),
        })),
        notes,
        submittedBy,
      };

      const { data } = await api.post("/movements/rto", payload);
      setItems([createEmptyLine()]);
      setNotes("");
      setState({
        error: "",
        loading: false,
        success: `RTO saved under submission ${data.submissionId}.`,
      });
    } catch (error) {
      setState({
        error: error.response?.data?.message || "Unable to save RTO.",
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
            <p>Keep the familiar movement card choice visible.</p>
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
              <p>Classify return quality for each product in the submission.</p>
            </div>
          </div>
          <span className={formStyles.itemBadge}>{items.length}</span>
        </div>

        <div className={formStyles.lineList}>
          {items.map((item, index) => (
            <div className={formStyles.lineItem} key={`rto-${index}`}>
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

              <div className={formStyles.lineGridThree}>
                <ProductSelector
                  onChange={(event) => updateLine(index, "productId", event.target.value)}
                  products={products}
                  value={item.productId}
                />
                <label className={formStyles.field}>
                  <span>RTO Right</span>
                  <input
                    min="0"
                    onChange={(event) => updateLine(index, "rtoRight", event.target.value)}
                    type="number"
                    value={item.rtoRight}
                  />
                </label>
                <label className={formStyles.field}>
                  <span>RTO Wrong</span>
                  <input
                    min="0"
                    onChange={(event) => updateLine(index, "rtoWrong", event.target.value)}
                    type="number"
                    value={item.rtoWrong}
                  />
                </label>
                <label className={formStyles.field}>
                  <span>RTO Fake</span>
                  <input
                    min="0"
                    onChange={(event) => updateLine(index, "rtoFake", event.target.value)}
                    type="number"
                    value={item.rtoFake}
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
            <p>Capture return condition notes or supporting context.</p>
          </div>
        </div>

        <label className={formStyles.field}>
          <span>Remarks</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Inspection note, package issue, or fraud marker"
            value={notes}
          />
        </label>
      </section>

      <div className={formStyles.formActions}>
        <span className={formStyles.supportText}>
          Only `RTO Right` adds stock back into inventory.
        </span>
        <button
          className={`primaryButton ${formStyles.submitRto}`}
          disabled={state.loading}
          type="submit"
        >
          {state.loading ? "Saving..." : "Submit RTO"}
        </button>
      </div>
    </form>
  );
}
