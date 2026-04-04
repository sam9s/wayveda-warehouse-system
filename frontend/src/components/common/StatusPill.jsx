import { getAlertTone, getStatusTone } from "../../utils/formatters.js";
import commonStyles from "./Common.module.css";

export function StatusPill({ kind = "status", value }) {
  const tone = kind === "alert" ? getAlertTone(value) : getStatusTone(value);

  return (
    <span className={`${commonStyles.statusPill} ${commonStyles[`pill${tone}`]}`}>
      {value || "N/A"}
    </span>
  );
}
