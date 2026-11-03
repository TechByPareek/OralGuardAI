import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight, Activity, BrainCircuit, ChartNoAxesCombined, CircleHelp, ShieldCheck, Sparkles, Stethoscope, TriangleAlert, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const reveal = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

function CountUp({ value, suffix = '', prefix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.65 })
  const reduceMotion = useReducedMotion()
  const [count, setCount] = useState(reduceMotion ? value : 0)

  useEffect(() => {
    if (!inView) return undefined
    if (reduceMotion) {
      setCount(value)
      return undefined
    }

    let frame
    const start = performance.now()
    const duration = 1100
    const tick = now => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setCount(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, reduceMotion, value])

  return <span ref={ref}>{prefix}{count}{suffix}</span>
}

function ToothIllustration() {
  return (
    <svg className="tooth-illustration" viewBox="0 0 460 430" role="img" aria-label="Tooth protected by a shield with a pulse line">
      <defs>
        <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
          <stop stopColor="#7C3AED" stopOpacity=".42" />
          <stop offset=".58" stopColor="#2563EB" stopOpacity=".3" />
          <stop offset="1" stopColor="#0B1020" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="toothFill" x1="120" x2="340" y1="70" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" />
          <stop offset=".5" stopColor="#F5F6FF" />
          <stop offset="1" stopColor="#C8D6FF" />
        </linearGradient>
        <linearGradient id="shieldFill" x1="275" x2="400" y1="90" y2="280" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" stopOpacity=".95" />
          <stop offset="1" stopColor="#7C3AED" stopOpacity=".92" />
        </linearGradient>
        <filter id="toothInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
          <feOffset in="blur" dx="0" dy="2" result="offsetBlur" />
          <feComposite in="SourceAlpha" in2="offsetBlur" operator="out" result="innerShadow" />
          <feFlood floodColor="#7484B8" floodOpacity=".24" result="shadowColor" />
          <feComposite in="shadowColor" in2="innerShadow" operator="in" result="coloredInnerShadow" />
          <feComposite in="SourceGraphic" in2="coloredInnerShadow" operator="over" />
        </filter>
        <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <circle cx="225" cy="210" r="155" fill="url(#heroGlow)" />
      <circle cx="225" cy="210" r="123" stroke="#A5B4FC" strokeOpacity=".13" strokeDasharray="3 11" strokeWidth="2" />
      <path d="M151 99c-29 0-53 24-53 55 0 19 9 34 15 52 6 19 9 49 19 75 6 16 15 31 28 31 18 0 17-44 35-60 9-8 22-8 31 0 18 16 17 60 35 60 13 0 22-15 28-31 10-26 13-56 19-75 6-18 15-33 15-52 0-31-24-55-53-55-20 0-35 12-60 12s-40-12-59-12Z" fill="url(#toothFill)" stroke="#E8EDFF" strokeWidth="4" filter="url(#toothInnerShadow)" />
      <path d="M324 94 389 119v54c0 52-31 88-65 105-34-17-65-53-65-105v-54l65-25Z" fill="url(#shieldFill)" stroke="#C4F1FF" strokeOpacity=".8" strokeWidth="3" filter="url(#softGlow)" />
      <path d="m295 174 19 19 39-42" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="9" />
      <path d="M50 274h70l18-25 23 48 25-71 22 48h48" fill="none" stroke="#22D3EE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
      <circle cx="50" cy="274" r="5" fill="#22D3EE" />
      <circle cx="256" cy="274" r="5" fill="#22D3EE" />
      <circle cx="360" cy="76" r="5" fill="#A78BFA" />
      <circle cx="78" cy="126" r="4" fill="#22D3EE" fillOpacity=".8" />
      <path d="M88 146c20-17 42-26 67-28" fill="none" stroke="#B9C9FF" strokeOpacity=".4" strokeDasharray="4 7" strokeWidth="2" />
    </svg>
  )
}

export default function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    fetch('https://oralguard-api.onrender.com/health')
      .catch(() => {})
  }, [])

  const features = [
    { icon: BrainCircuit, title: 'Explainable AI', desc: 'See which answers influenced your model score with a clear, SHAP-based explanation.' },
    { icon: ShieldCheck, title: 'Built for awareness', desc: 'A thoughtful screening experience designed to support informed conversations.' },
    { icon: ChartNoAxesCombined, title: 'A clearer picture', desc: 'Explore a five-category view of symptoms, habits, hygiene, lifestyle and medical history.' },
    { icon: Zap, title: 'About two minutes', desc: 'A simple, guided assessment. No account required and no survey data stored.' },
  ]

  const stats = [
    { value: 68, suffix: '', label: 'survey respondents' },
    { value: 29, suffix: '', label: 'risk factors considered' },
    { value: 2, prefix: '~', label: 'minutes to complete' },
    { value: 'SHAP', label: 'explainable insights' },
  ]

  const tech = ['XGBoost', 'SHAP XAI', 'FastAPI', 'React', 'Radar Chart']
  const steps = [
    { icon: Activity, title: 'Share your context', desc: 'Answer a few guided questions about your habits, oral health and symptoms.' },
    { icon: BrainCircuit, title: 'Review your analysis', desc: 'The model processes your responses and highlights the factors behind its score.' },
    { icon: Stethoscope, title: 'Explore next steps', desc: 'Get a readable summary and supportive suggestions to discuss with a professional.' },
  ]

  return (
    <div className="page-shell">
      <header className="site-nav">
        <div className="container nav-inner">
          <a className="brand" href="/" aria-label="OralGuard home">
            <span className="brand-mark"><ShieldCheck size={19} /></span>
            <span>OralGuard</span>
          </a>
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
          </nav>
          <div className="nav-actions">
            <span className="nav-signin" aria-hidden="true">&nbsp;</span>
            <button className="btn-primary" onClick={() => navigate('/assess')}>
              Check My Risk <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="aurora" aria-hidden="true">
            <span className="aurora-blob aurora-blob-one" />
            <span className="aurora-blob aurora-blob-two" />
            <span className="aurora-blob aurora-blob-three" />
          </div>
          <div className="container hero-grid">
            <motion.div className="hero-copy" initial="hidden" animate="visible" variants={reveal}>
              <span className="hero-eyebrow"><Sparkles size={14} /> Health insights, made clearer</span>
              <h1 className="hero-title">Know Your <span className="gradient-text">Oral Cancer Risk</span></h1>
              <p className="hero-description">
                A guided, AI-powered awareness assessment that helps you understand the factors behind your oral health profile.
              </p>
              <div className="hero-actions">
                <button className="btn-primary" onClick={() => navigate('/assess')}>
                  Check My Risk <ArrowRight size={17} />
                </button>
                <a className="btn-ghost" href="#how-it-works">
                  See how it works <ArrowDown size={15} />
                </a>
              </div>
              <div className="tech-chips" aria-label="Technology">
                {tech.map(item => <span className="chip" key={item}>{item}</span>)}
              </div>
            </motion.div>

            <motion.div className="hero-art" initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8, delay: .12 }}>
              <ToothIllustration />
              <span className="art-chip art-chip-top"><ShieldCheck size={16} /> Private by design</span>
              <span className="art-chip art-chip-bottom"><Activity size={16} /> Explainable insights</span>
            </motion.div>
          </div>
        </section>

        <section className="stats-section" aria-label="Assessment overview">
          <motion.div className="container stats-grid glass-card" initial="hidden" whileInView="visible" viewport={{ once: true, amount: .35 }} variants={reveal}>
            {stats.map((item, index) => (
              <motion.div className="stat-item" key={item.label} variants={reveal} transition={{ delay: index * .08 }}>
                <span className="stat-value">
                  {typeof item.value === 'number'
                    ? <CountUp value={item.value} prefix={item.prefix} suffix={item.suffix} />
                    : item.value}
                </span>
                <span className="stat-label">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="section-block" id="features">
          <div className="container">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .5 }} variants={reveal}>
              <p className="eyebrow" style={{ justifyContent: 'center' }}>A more thoughtful health tool</p>
              <h2 className="section-title">Clarity at every step.</h2>
              <p className="section-intro">Useful context, transparent insights, and a calmer way to explore your oral health.</p>
            </motion.div>
            <div className="feature-grid">
              {features.map(({ icon: Icon, title, desc }, index) => (
                <motion.article className="feature-card glass-card" key={title} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .2 }} variants={reveal} transition={{ delay: index * .08 }} whileHover={{ y: -5, rotateX: 1, rotateY: index % 2 ? -1 : 1 }}>
                  <span className="feature-icon"><Icon size={22} /></span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="steps-section" id="how-it-works">
          <div className="container">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal}>
              <p className="eyebrow" style={{ justifyContent: 'center' }}>Simple by design</p>
              <h2 className="section-title">How it works</h2>
            </motion.div>
            <div className="steps-grid">
              <span className="steps-line" aria-hidden="true" />
              {steps.map(({ icon: Icon, title, desc }, index) => (
                <motion.article className="step-card" key={title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal} transition={{ delay: index * .12 }}>
                  <span className="step-node">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <Icon size={17} style={{ marginTop: 12, color: '#8792b0' }} />
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="container" aria-label="Important information">
          <div className="disclaimer-strip">
            <TriangleAlert size={18} />
            <p><strong>Not a diagnosis.</strong> OralGuard provides awareness information only. It cannot confirm or rule out a health condition. Please consult a qualified dentist or doctor about concerns or persistent symptoms.</p>
          </div>
        </section>

        <section className="section-block">
          <motion.div className="container final-cta glass-card" initial="hidden" whileInView="visible" viewport={{ once: true, amount: .35 }} variants={reveal}>
            <p className="eyebrow" style={{ justifyContent: 'center' }}><CircleHelp size={14} /> Start with a clearer picture</p>
            <h2 className="section-title">A few minutes for better awareness.</h2>
            <p>No sign-up required. Take the assessment at your own pace.</p>
            <button className="btn-primary" onClick={() => navigate('/assess')}>Start free assessment <ArrowRight size={16} /></button>
          </motion.div>
        </section>
      </main>

      <footer className="container site-footer">
        <a className="brand" href="/" aria-label="OralGuard home"><span className="brand-mark"><ShieldCheck size={17} /></span><span>OralGuard</span></a>
        <p>Awareness, not diagnosis. Consult a qualified healthcare professional for advice.</p>
      </footer>
    </div>
  )
}
