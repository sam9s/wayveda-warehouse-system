import commonStyles from "./Common.module.css";

export function DateRangePicker({ from, onChange, to }) {
  return (
    <div className={commonStyles.filterRow}>
      <label className={commonStyles.field}>
        <span>From</span>
        <input
          onChange={(event) => onChange({ from: event.target.value, to })}
          type="date"
          value={from}
        />
      </label>

      <label className={commonStyles.field}>
        <span>To</span>
        <input
          onChange={(event) => onChange({ from, to: event.target.value })}
          type="date"
          value={to}
        />
      </label>
    </div>
  );
}
