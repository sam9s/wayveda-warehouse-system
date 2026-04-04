import commonStyles from "./Common.module.css";

export function EmptyState({
  action,
  icon: Icon,
  message,
  title,
}) {
  return (
    <div className={commonStyles.emptyState}>
      {Icon ? (
        <div className={commonStyles.emptyIcon}>
          <Icon size={20} />
        </div>
      ) : null}
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
