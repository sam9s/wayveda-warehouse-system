import commonStyles from "./Common.module.css";

const DEFAULT_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

export function PeriodToggle({
  onChange,
  options = DEFAULT_OPTIONS,
  value,
}) {
  return (
    <div className={commonStyles.toggleRail} role="tablist">
      {options.map((option) => (
        <button
          aria-selected={value === option.value}
          className={`${commonStyles.toggleButton} ${
            value === option.value ? commonStyles.toggleButtonActive : ""
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
