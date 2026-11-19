import { Icon } from './Icon';

// "Export CSV" button. Takes the page's own button style (className), since player
// pages and the admin console style buttons differently.
export function ExportButton({ onExport, count, className = 'db-btn-light', label = 'Export CSV' }) {
  const empty = count === 0;
  return (
    <button
      type="button"
      className={className}
      onClick={onExport}
      disabled={empty}
      title={empty ? 'Nothing to export' : count != null ? `Download ${count} ${count === 1 ? 'row' : 'rows'} as a CSV file` : 'Download as a CSV file'}
    >
      <Icon name="download" size={15} /> <span>{label}</span>
    </button>
  );
}
