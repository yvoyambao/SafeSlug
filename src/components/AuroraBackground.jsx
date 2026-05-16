import '../styles/AuroraBackground.css'

export default function AuroraBackground({ children }) {
  return (
    <div className="aurora-root">
      <div className="aurora-overlay">
        <div className="aurora-layer" />
      </div>
      <div className="aurora-content aurora-fade-in">
        {children}
      </div>
    </div>
  )
}
