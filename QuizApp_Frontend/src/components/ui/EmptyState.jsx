// Placeholder shown when a list has nothing to show

export function EmptyState({ icon, title, text, action }) {
  return (
    <div className="ad-empty">
      <span className="ad-empty-icon" aria-hidden="true">{icon}</span>
      <p className="ad-empty-title">{title}</p>
      {text && <p className="ad-empty-text">{text}</p>}
      {action}
    </div>
  );
}
