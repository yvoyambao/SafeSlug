import { useState } from 'react'
import '../styles/NavBar.css'

export default function NavBar({ currentPage, onNavigate }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleNavClick = (page, scrollTarget) => {
    onNavigate(page, scrollTarget)
    setIsMenuOpen(false)
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <a href="/" onClick={(e) => { e.preventDefault(); handleNavClick('home') }}>
            <span className="nav-slug-icon">🐌</span>SafeSlug
          </a>
        </div>
        
        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <a 
            href="/" 
            className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleNavClick('home') }}
          >
            Home
          </a>
          <a 
            href="/map" 
            className={`nav-link ${currentPage === 'map' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); handleNavClick('map') }}
          >
            Live Map
          </a>
          <a
            href="/contact"
            className={`nav-link ${currentPage === 'contact' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              handleNavClick('contact')
            }}
          >
            Contact
          </a>
        </div>

        <div className="nav-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  )
}
