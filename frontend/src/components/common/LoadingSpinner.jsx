import commonStyles from "./Common.module.css";

export function LoadingSpinner({ label = "Loading", page = false }) {
  return (
    <div className={page ? commonStyles.fullPageSpinner : commonStyles.inlineSpinner}>
      <span className={commonStyles.spinnerRing} />
      <span>{label}</span>
    </div>
  );
}
