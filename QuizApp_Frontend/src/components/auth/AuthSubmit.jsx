// Submit button with a loading spinner

export function AuthSubmit({ loading, loadingText, children }) {
  return (
    <button type="submit" className="au-btn" disabled={loading}>
      {loading && <span className="au-spinner" aria-hidden="true" />}
      {loading ? loadingText : children}
    </button>
  );
}
