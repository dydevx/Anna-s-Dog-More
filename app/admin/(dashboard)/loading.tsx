export default function AdminLoading() {
  return (
    <div
      className="admin-route-loading"
      role="status"
      aria-live="polite"
      aria-label="Admin-Seite wird geladen"
    >
      <header className="admin-loading-heading" aria-hidden="true">
        <div>
          <span />
          <strong />
          <small />
        </div>
        <i />
      </header>

      <section className="admin-loading-panel" aria-hidden="true">
        <div className="admin-loading-panel-heading">
          <span />
          <small />
        </div>
        <div className="admin-loading-rows">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index}>
              <span />
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
