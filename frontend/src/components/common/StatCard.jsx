import commonStyles from "./Common.module.css";

export function StatCard({
  details = [],
  helper,
  icon: Icon,
  label,
  tone = "neutral",
  value,
}) {
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
      {details.length ? (
        <div className={commonStyles.statCardDetails}>
          {details.map((detail) => (
            <div className={commonStyles.statCardDetailRow} key={detail.label}>
              <span>{detail.label}</span>
              <strong>{detail.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
