import commonStyles from "./Common.module.css";

export function Tabs({ items, onChange, value }) {
  return (
    <div className={commonStyles.tabs}>
      {items.map((item) => (
        <button
          className={`${commonStyles.tabButton} ${
            item.value === value ? commonStyles.tabButtonActive : ""
          }`}
          key={item.value}
          onClick={() => onChange(item.value)}
          type="button"
        >
          <span>{item.label}</span>
          {item.badge ? <strong>{item.badge}</strong> : null}
        </button>
      ))}
    </div>
  );
}
