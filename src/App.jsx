import { useEffect, useRef, useState } from 'react'
import './App.css'
import NavBar from './components/NavBar'
import LiveMap from './components/LiveMap'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const pendingScrollTargetRef = useRef(null)

  useEffect(() => {
    if (currentPage !== 'home') return

    const elements = document.querySelectorAll('.scroll-animate')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target
          if (entry.isIntersecting) {
            el.classList.add('visible')
            el.classList.remove('out-up')
          } else {
            // If the element's top is above viewport, user scrolled past it (scrolling down)
            if (entry.boundingClientRect.top < 0) {
              el.classList.add('out-up')
              el.classList.remove('visible')
            } else {
              // element is below viewport (not reached yet)
              el.classList.remove('visible', 'out-up')
            }
          }
        })
      },
      { threshold: 0.15 }
    )

    elements.forEach((element) => {
      element.classList.add('visible')
      observer.observe(element)
    })
    return () => observer.disconnect()
  }, [currentPage])

  useEffect(() => {
    if (currentPage !== 'home' || !pendingScrollTargetRef.current) return

    const target = document.getElementById(pendingScrollTargetRef.current)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    pendingScrollTargetRef.current = null
  }, [currentPage])

  const handleNavigation = (page, scrollTarget = null) => {
    pendingScrollTargetRef.current = scrollTarget
    setCurrentPage(page)

    if (page === 'home' && scrollTarget && currentPage === 'home') {
      requestAnimationFrame(() => {
        document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        pendingScrollTargetRef.current = null
      })
    }
  }

  if (currentPage === 'map') {
    return (
      <div className="App app-map">
        <NavBar currentPage={currentPage} onNavigate={handleNavigation} />
        <LiveMap />
      </div>
    )
  }

  if (currentPage === 'contact') {
    return (
      <div className="App app-contact">
        <NavBar currentPage={currentPage} onNavigate={handleNavigation} />
        <main className="contact-page">
          <section className="contact-hero scroll-animate visible">
            <p className="eyebrow">Get in touch</p>
            <h1>Contact SafeSlug</h1>
            <p>
              Reach out to the team directly. These are the current project emails and placeholder headshots
              for the contact page.
            </p>
          </section>

          <section className="contact-grid">
            <article className="contact-card scroll-animate visible">
              <div className="headshot-placeholder">CF</div>
              <div>
                <p className="contact-name">Chris Fajardo</p>
                <p className="contact-email">chfajard@ucsc.edu</p>
              </div>
            </article>

            <article className="contact-card scroll-animate visible">
              <div className="headshot-placeholder">YY</div>
              <div>
                <p className="contact-name">Yyambao</p>
                <p className="contact-email">yyambao@ucsc.edu</p>
              </div>
            </article>
          </section>

          <section className="contact-footer scroll-animate visible">
            <a className="btn btn-primary" href="/" onClick={(e) => { e.preventDefault(); handleNavigation('home') }}>
              Back to home
            </a>
          </section>
        </main>
      </div>
    )
  }

  if (currentPage === 'community') {
    return (
      <div className="App app-community">
        <NavBar currentPage={currentPage} onNavigate={handleNavigation} />
        <main className="community-page">
          <section className="community-hero scroll-animate visible">
            <p className="eyebrow">Community Feed</p>
            <h1>Recent local updates</h1>
            <p>Live reports from UCSC-area users and incident summaries from the community channel.</p>
          </section>

          <section className="community-feed">
            <article className="report-item scroll-animate visible">
              <p className="report-location">Porter Meadow</p>
              <p>Someone reported a loud disturbance near the dorms late last night.</p>
              <span>12 minutes ago</span>
            </article>
            <article className="report-item scroll-animate visible">
              <p className="report-location">Mission St</p>
              <p>A student shared that a vehicle was driving erratically near the intersection.</p>
              <span>32 minutes ago</span>
            </article>
            <article className="report-item scroll-animate visible">
              <p className="report-location">East Remote</p>
              <p>Reported suspicious activity around the parking lot after midnight.</p>
              <span>47 minutes ago</span>
            </article>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="App app-home">
      <NavBar currentPage={currentPage} onNavigate={handleNavigation} />
      <header className="hero scroll-animate">
        <p className="eyebrow">UCSC safety monitoring</p>
        <h1>SafeSlug</h1>
        <p>
          Real-time Santa Cruz incident reporting for UCSC students and Santa Cruz residents. Get trusted
          local alerts, plain-English summaries, and community updates before they land on social media.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#how-it-works">How It Works</a>
          <a className="btn btn-secondary" href="#mission">Our Mission</a>
          <a className="btn btn-primary" href="/" onClick={(e) => { e.preventDefault(); handleNavigation('map') }}>Live Map</a>
          <a className="btn btn-secondary" href="/community" onClick={(e) => { e.preventDefault(); handleNavigation('community') }}>Community Feed</a>
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

        <section id="mission" className="section features-section scroll-animate">
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

        <section id="preview" className="section preview-section scroll-animate">
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
