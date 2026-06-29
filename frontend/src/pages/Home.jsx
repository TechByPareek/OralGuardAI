import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function Home() {
  const navigate = useNavigate()
  useEffect(() => {
  fetch('https://oralguard-api.onrender.com/health')
    .catch(() => {})
}, [])

  const features = [
    { icon: '🤖', title: 'XGBoost AI Model', desc: 'Trained on real Gen Z survey data from Indian college students with SMOTE balancing' },
    { icon: '🔍', title: 'SHAP Explainability', desc: 'Know exactly which factors affect your risk — not just a black box score' },
    { icon: '📊', title: 'Radar Risk Chart', desc: 'Visual breakdown across Habits, Hygiene, Symptoms, Lifestyle and Medical History' },
    { icon: '⚡', title: '2-Minute Assessment', desc: 'Quick and easy — no registration, no data stored, instant results' },
  ]

  const stats = [
    { num: '43%', label: 'Never visited a dentist in 2+ years' },
    { num: '31%', label: 'Reported mouth ulcers in past 6 months' },
    { num: '68%', label: 'Unaware of key oral cancer symptoms' },
  ]

  return (
    <div>
      <nav className="navbar">
        <span className="navbar-brand">🦷 OralGuard</span>
        <span className="navbar-tag">AI-Powered</span>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)', color: 'white', padding: '70px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px', padding: '6px 16px', fontSize: '12px', fontWeight: 700, color: '#93c5fd', marginBottom: '20px', letterSpacing: '0.06em' }}>
          🎓 Built on primary research · 68 Gen Z respondents
        </div>
        <h1 className="hero-title" style={{ fontSize: '44px', fontWeight: 900, lineHeight: 1.15, marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Know Your<br />
          <span style={{ color: '#60a5fa' }}>Oral Cancer Risk</span>
        </h1>
        <p className="hero-subtitle" style={{ fontSize: '17px', color: '#cbd5e1', maxWidth: '500px', margin: '0 auto 32px', lineHeight: 1.7 }}>
          A 2-minute AI-powered assessment designed for Gen Z. Get your personalized risk report with SHAP explanations and a radar chart breakdown.
        </p>
        <div className="hero-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => navigate('/assess')}
            style={{ background: 'white', color: '#1d4ed8', fontSize: '16px', padding: '14px 32px' }}>
            Check My Risk →
          </button>
          <button onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })}
            style={{ background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', padding: '13px 24px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
            Learn More
          </button>
        </div>

        {/* Floating pills */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '32px' }}>
          {['XGBoost', 'SHAP XAI', 'FastAPI', 'React', 'Radar Chart'].map((t, i) => (
            <span key={i} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '4px 14px', fontSize: '12px', color: '#cbd5e1', fontWeight: 500 }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: '#1e3a8a', padding: '36px 24px' }}>
        <div className="container">
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#93c5fd', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '24px' }}>
            From our survey of 68 Gen Z college students
          </p>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '36px', fontWeight: 900, color: '#60a5fa', letterSpacing: '-0.02em' }}>{s.num}</div>
                <div style={{ fontSize: '12px', color: '#93c5fd', marginTop: '6px', lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="about" style={{ padding: '60px 24px' }}>
        <div className="container">
          <p style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Why OralGuard?
          </p>
          <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 800, marginBottom: '40px', color: '#0f172a' }}>
            Built different from every other health app
          </h2>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {features.map((f, i) => (
              <div key={i} className="card" style={{ transition: 'transform 0.2s', cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{f.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>{f.title}</div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: '#f8fafc', padding: '50px 24px', borderTop: '1px solid #e2e8f0' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 800, marginBottom: '36px', color: '#0f172a' }}>
            How it works
          </h2>
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
            {[
              { step: '01', icon: '📋', title: 'Fill the form', desc: '3 quick steps covering your habits, hygiene and symptoms' },
              { step: '02', icon: '🤖', title: 'AI analyses', desc: 'XGBoost model processes 29 factors with SHAP explainability' },
              { step: '03', icon: '📊', title: 'Get your report', desc: 'Radar chart, risk score, and personalised recommendations' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ width: '44px', height: '44px', background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '13px', fontWeight: 900, color: '#1d4ed8' }}>
                  {s.step}
                </div>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>{s.title}</div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA bottom */}
      <div style={{ background: '#0f172a', padding: '50px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'white', marginBottom: '12px' }}>
          Ready to check your risk?
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '15px' }}>
          Takes 2 minutes. No sign-up required.
        </p>
        <button className="btn-primary" onClick={() => navigate('/assess')}
          style={{ fontSize: '16px', padding: '14px 36px' }}>
          Start Free Assessment →
        </button>
      </div>

      {/* Footer */}
      <div style={{ background: '#020617', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#475569' }}>
          ⚠️ OralGuard is an AI awareness tool — not a medical diagnosis. Always consult a qualified dental professional.
        </p>
      </div>
    </div>
  )
}