/** Carte KPI admin — réserve la hauteur même pendant le chargement (évite le CLS). */
function AdminStatCard({ label, value, loading = false }) {
  return (
    <article className="admin-stat-card">
      <p className="admin-stat-label">{label}</p>
      <p
        className={`admin-stat-value${loading ? ' is-skeleton' : ''}`}
        aria-busy={loading || undefined}
      >
        {loading ? '\u00A0' : value}
      </p>
    </article>
  )
}

export default AdminStatCard
