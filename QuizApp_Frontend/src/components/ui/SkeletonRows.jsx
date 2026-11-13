// Grey placeholder rows while a list loads

export function SkeletonRows({ rows = 6 }) {
  return (
    <div className="ad-skeleton-list">
      {[...Array(rows)].map((_, i) => <div key={i} className="ad-skeleton" />)}
    </div>
  );
}
