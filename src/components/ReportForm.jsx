import { useEffect, useState } from 'react'
import LocationInput from './LocationInput'

const categories = ['Crime', 'Fire', 'Medical', 'Traffic', 'Other']
const severities = ['High', 'Medium', 'Low']

function ReportForm({ onSubmit, defaultLocation }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [severity, setSeverity] = useState(severities[1])
  const [location, setLocation] = useState('')
  const [selectedCoords, setSelectedCoords] = useState(null)

  useEffect(() => {
    if (defaultLocation) {
      const frame = window.requestAnimationFrame(() => {
        setLocation(`${defaultLocation.lat.toFixed(4)}, ${defaultLocation.lng.toFixed(4)}`)
      })

      return () => window.cancelAnimationFrame(frame)
    }
  }, [defaultLocation])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!title.trim() || !description.trim()) return

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      severity,
      location: location.trim(),
      coords: selectedCoords || defaultLocation,
    })

    setTitle('')
    setDescription('')
  }

  return (
    <section className="panel report-panel">
      <div className="panel-title-row">
        <div>
          <h3>Community report</h3>
          <p className="panel-note">Submit a safety update with location details and severity information.</p>
        </div>
      </div>
      <form className="report-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>What happened?</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Short title for your report"
          />
        </label>

        <label className="form-field">
          <span>Describe the situation</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Share any context that helps neighbors stay safe"
          />
        </label>

        <div className="fields-row">
          <label className="form-field small-field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="form-field small-field">
            <span>Severity</span>
            <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
              {severities.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="form-field">
          <span>Location</span>
          <LocationInput
            value={location}
            onChange={setLocation}
            onSelect={(coords) => setSelectedCoords(coords)}
            placeholder="Search for a street or place..."
          />
        </label>

        <button type="submit" className="btn btn-primary">
          Submit report
        </button>
      </form>
    </section>
  )
}

export default ReportForm
