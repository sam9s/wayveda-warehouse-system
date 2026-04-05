import { useEffect, useId, useMemo, useRef, useState } from "react";
import commonStyles from "./Common.module.css";

const INITIAL_RESULT_LIMIT = 12;
const SEARCH_RESULT_LIMIT = 60;

function buildProductMeta(product) {
  return [product.sku, product.category].filter(Boolean).join(" | ");
}

function matchesProduct(product, normalizedQuery) {
  if (!normalizedQuery) {
    return true;
  }

  return [product.name, product.sku, product.category]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

function emitValueChange(onChange, name, value) {
  onChange?.({
    target: {
      name,
      value,
    },
  });
}

export function ProductSelector({
  label = "Product",
  name = "productId",
  onChange,
  placeholder = "Type product name or SKU",
  products = [],
  value = "",
}) {
  const inputId = useId();
  const rootRef = useRef(null);
  const skipValueSyncRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === value) || null,
    [products, value]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const matchingProducts = useMemo(
    () => products.filter((product) => matchesProduct(product, normalizedQuery)),
    [normalizedQuery, products]
  );

  const hasTypedSearch = normalizedQuery.length > 0;
  const visibleProducts = hasTypedSearch
    ? matchingProducts.slice(0, SEARCH_RESULT_LIMIT)
    : matchingProducts.slice(0, INITIAL_RESULT_LIMIT);

  const isResultTrimmed = matchingProducts.length > visibleProducts.length;

  useEffect(() => {
    if (skipValueSyncRef.current) {
      skipValueSyncRef.current = false;
      return;
    }

    setQuery(selectedProduct?.name || "");
  }, [selectedProduct]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery, isOpen]);

  function closeMenu() {
    setIsOpen(false);
    setActiveIndex(0);
    setQuery(selectedProduct?.name || "");
  }

  function handleFocus() {
    setIsOpen(true);
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        closeMenu();
      }
    }, 0);
  }

  function handleInputChange(event) {
    const nextQuery = event.target.value;

    setQuery(nextQuery);
    setIsOpen(true);

    if (value) {
      skipValueSyncRef.current = true;
      emitValueChange(onChange, name, "");
    }
  }

  function selectProduct(product) {
    setQuery(product.name);
    setIsOpen(false);
    setActiveIndex(0);
    emitValueChange(onChange, name, product.id);
  }

  function clearSelection() {
    skipValueSyncRef.current = true;
    setQuery("");
    setIsOpen(false);
    setActiveIndex(0);
    emitValueChange(onChange, name, "");
  }

  function handleKeyDown(event) {
    if (!isOpen && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      setIsOpen(true);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (!visibleProducts.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((currentIndex) =>
        Math.min(currentIndex + 1, visibleProducts.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectProduct(visibleProducts[activeIndex] || visibleProducts[0]);
    }
  }

  return (
    <div className={commonStyles.field}>
      <span>{label}</span>
      <div className={commonStyles.combobox} ref={rootRef}>
        <div className={commonStyles.comboboxControl}>
          <input
            aria-autocomplete="list"
            aria-controls={`${inputId}-listbox`}
            aria-expanded={isOpen}
            aria-label={label}
            className={commonStyles.comboboxInput}
            id={inputId}
            onBlur={handleBlur}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            type="text"
            value={query}
          />

          <div className={commonStyles.comboboxActions}>
            <span className={commonStyles.comboboxMeta}>
              {value ? "Selected" : "Search"}
            </span>
            {query || value ? (
              <button
                className={commonStyles.comboboxClear}
                onClick={clearSelection}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {isOpen ? (
          <div className={commonStyles.comboboxMenu}>
            <p className={commonStyles.comboboxHint}>
              {isResultTrimmed
                ? `Showing ${visibleProducts.length} of ${matchingProducts.length} products. Keep typing to narrow results.`
                : "Start typing and choose the exact product from the list."}
            </p>

            <div
              className={commonStyles.comboboxList}
              id={`${inputId}-listbox`}
              role="listbox"
            >
              {visibleProducts.length ? (
                visibleProducts.map((product, index) => (
                  <button
                    aria-selected={product.id === value}
                    className={`${commonStyles.comboboxOption} ${
                      index === activeIndex ? commonStyles.comboboxOptionActive : ""
                    }`}
                    key={product.id}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectProduct(product);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    type="button"
                  >
                    <span className={commonStyles.comboboxOptionLabel}>
                      {product.name}
                    </span>
                    <span className={commonStyles.comboboxOptionMeta}>
                      {buildProductMeta(product) || "No SKU or category set"}
                    </span>
                  </button>
                ))
              ) : (
                <div className={commonStyles.comboboxEmpty}>
                  No products matched this search.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
