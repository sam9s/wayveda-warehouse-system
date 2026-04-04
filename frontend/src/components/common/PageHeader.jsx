import commonStyles from "./Common.module.css";

export function PageHeader({ actions, eyebrow, description, title }) {
  return (
    <div className={commonStyles.pageHeader}>
      <div>
        {eyebrow ? <p className={commonStyles.eyebrow}>{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p className={commonStyles.description}>{description}</p> : null}
      </div>

      {actions ? <div className={commonStyles.headerActions}>{actions}</div> : null}
    </div>
  );
}
