// Titled card that holds one chart

export function Panel({ title, sub, className = '', children }) {
  return (
    <section className={`db-panel an-panel ${className}`}>
      <div className="an-panel-head">
        <h2 className="db-section-title">{title}</h2>
        {sub && <p className="db-section-sub">{sub}</p>}
      </div>
      {children}
    </section>
  );
}
