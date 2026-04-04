import commonStyles from "./Common.module.css";

export function StatCard({ helper, icon: Icon, label, tone = "neutral", value }) {
  return (
    <article className={`${commonStyles.statCard} ${commonStyles[`tone${tone}`]}`}>
      <div className={commonStyles.statCardTop}>
        <p>{label}</p>
        {Icon ? (
          <div className={commonStyles.statIcon}>
            <Icon size={18} />
          </div>
        ) : null}
      </div>
      <strong>{value}</strong>
      {helper ? <span>{helper}</span> : null}
    </article>
  );
}
