function IncidentCard({ incident, onClose }) {
  if (!incident) {
    return (
      <section className="incident-card empty-card">
        <h3>Incident details</h3>
        <p>Submit a report to highlight an event when the incident feed is active.</p>
      </section>
    )
  }

  return (
    <section className="incident-card">
      <div className="incident-card-header">
        <div>
          <span className={`badge severity-${incident.severity.toLowerCase()}`}>{incident.severity}</span>
          <span className="badge category-badge">{incident.category}</span>
        </div>
        <button type="button" className="close-button" onClick={onClose} aria-label="Close details">
          ×
        </button>
      </div>
      <div className="incident-card-meta">
        <span>{incident.emoji}</span>
        <span className="incident-location">{incident.address}</span>
        <span className="incident-time">{incident.time}</span>
      </div>
      <h3>{incident.title}</h3>
      <p>{incident.summary}</p>
      <div className="incident-footnote">
        <span>{incident.comments?.length ?? 0} comment{incident.comments?.length === 1 ? '' : 's'}</span>
        <span>{incident.category} • {incident.severity}</span>
      </div>
    </section>
  )
}

export default IncidentCard
