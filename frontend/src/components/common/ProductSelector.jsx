import commonStyles from "./Common.module.css";

export function ProductSelector({
  label = "Product",
  name = "productId",
  onChange,
  products,
  value,
}) {
  return (
    <label className={commonStyles.field}>
      <span>{label}</span>
      <select name={name} onChange={onChange} value={value}>
        <option value="">Select a product</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
    </label>
  );
}
