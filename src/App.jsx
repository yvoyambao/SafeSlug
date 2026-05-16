import { useEffect } from 'react'
import './App.css'

function App() {
  useEffect(() => {
    const elements = document.querySelectorAll('.scroll-animate')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 }
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])
  return (
    <div className="App">
      <header className="hero scroll-animate">
        <p className="eyebrow">UCSC safety monitoring</p>
        <h1>SafeSlug</h1>
        <p>
          Real-time Santa Cruz incident reporting for UCSC students and Santa Cruz residents. Get trusted
          local alerts, plain-English summaries, and community updates before they land on social media.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#how-it-works">How it works</a>
          <a className="btn btn-secondary" href="#community">Community feed</a>
        </div>
      </header>

      <main className="page-content">
        <section id="how-it-works" className="section steps-section scroll-animate">
          <div className="section-header">
            <p className="section-label">How It Works</p>
            <h2>3 simple steps</h2>
          </div>
          <div className="step-grid">
            <article className="step-card">
              <div className="step-number">1</div>
              <h3>Official scanner and sheriff data</h3>
              <p>We monitor public Santa Cruz sheriff and scanner feeds so you don’t have to.</p>
            </article>
            <article className="step-card">
              <div className="step-number">2</div>
              <h3>AI decodes every incident</h3>
              <p>Our agent turns police reports into plain English summaries with severity and category.</p>
            </article>
            <article className="step-card">
              <div className="step-number">3</div>
              <h3>See it on the map in real time</h3>
              <p>Live updates appear quickly so UCSC students can stay aware and make safer choices.</p>
            </article>
          </div>
        </section>

        <section className="section features-section scroll-animate">
          <div className="section-header">
            <p className="section-label">Why SafeSlug</p>
            <h2>Why this matters</h2>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-icon">⏱️</span>
              <h3>Real Time</h3>
              <p>Not hours or days later — alerts show up as incidents happen.</p>
            </article>
            <article className="feature-card">
              <span className="feature-icon">🧠</span>
              <h3>AI Powered</h3>
              <p>Plain English summaries with no police jargon, so every student can understand.</p>
            </article>
            <article className="feature-card">
              <span className="feature-icon">🤝</span>
              <h3>Community Driven</h3>
              <p>Users can submit local reports to add context and keep people informed.</p>
            </article>
          </div>
        </section>

        <section className="section preview-section scroll-animate">
          <div className="preview-panel">
            <div className="preview-header">
              <p className="section-label">Live Map Preview</p>
              <h2>See a sneak peek of the map</h2>
            </div>
            <div className="preview-map">
              <div className="preview-pin pin-high">🚨</div>
              <div className="preview-pin pin-medium">⚠️</div>
              <div className="preview-pin pin-low">ℹ️</div>
              <div className="preview-wave" />
              <div className="preview-wave preview-wave--alt" />
            </div>
            <p className="preview-copy">
              A clean, trusted dashboard for the UCSC area. This preview shows how incidents will appear with severity-based pins.
            </p>
          </div>
        </section>

        <section className="section stats-section scroll-animate">
          <div className="stat-card">
            <span>Incidents tracked today</span>
            <strong>18</strong>
          </div>
          <div className="stat-card">
            <span>Active users</span>
            <strong>344</strong>
          </div>
          <div className="stat-card">
            <span>Neighborhoods covered</span>
            <strong>12</strong>
          </div>
          <div className="stat-card">
            <span>Average response time</span>
            <strong>5 min</strong>
          </div>
        </section>

        <section id="community" className="section reports-section scroll-animate">
          <div className="section-header">
            <p className="section-label">Community Reports</p>
            <h2>Recent local updates</h2>
          </div>
          <div className="report-feed">
            <article className="report-item">
              <p className="report-location">Porter Meadow</p>
              <p>Someone reported a loud disturbance near the dorms late last night.</p>
              <span>12 minutes ago</span>
            </article>
            <article className="report-item">
              <p className="report-location">Mission St</p>
              <p>A student shared that a vehicle was driving erratically near the intersection.</p>
              <span>32 minutes ago</span>
            </article>
            <article className="report-item">
              <p className="report-location">East Remote</p>
              <p>Reported suspicious activity around the parking lot after midnight.</p>
              <span>47 minutes ago</span>
            </article>
          </div>
        </section>

        <section className="section student-section scroll-animate">
          <div className="student-panel">
            <p className="section-label">For Students</p>
            <h2>Stay aware on campus</h2>
            <ul>
              <li>Walking home late at night?</li>
              <li>Heard something outside your dorm?</li>
              <li>SafeSlug keeps you informed.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
