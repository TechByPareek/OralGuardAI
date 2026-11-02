import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, Download, Heart, HeartPulse, Info, ShieldAlert, ShieldCheck, Sparkles, Stethoscope, TriangleAlert } from 'lucide-react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

const categoryNames = ['Symptoms', 'Habits', 'Hygiene', 'Lifestyle', 'Medical']

function AnimatedNumber({ value, suffix = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: .5 })
  const reduceMotion = useReducedMotion()
  const [count, setCount] = useState(reduceMotion ? value : 0)

  useEffect(() => {
    if (!isInView) return undefined
    if (reduceMotion) {
      setCount(value)
      return undefined
    }

    let frame
    const started = performance.now()
    const duration = 900
    const tick = now => {
      const progress = Math.min((now - started) / duration, 1)
      setCount(Math.round(value * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isInView, reduceMotion, value])

  return <span ref={ref}>{count}{suffix}</span>
}

function getRadarScores(form = {}) {
  const symptoms = Math.min(10, Math.round((parseInt(form.mouth_ulcers || 0) + parseInt(form.white_patches || 0) + parseInt(form.mouth_pain || 0) + parseInt(form.difficulty_swallowing || 0) + parseInt(form.swelling_lumps || 0) + parseInt(form.voice_change || 0)) / 12 * 10 * 10) / 10)
  const habits = Math.min(10, Math.round((parseInt(form.smoking || 0) + parseInt(form.vaping || 0) + parseInt(form.alcohol || 0) + parseInt(form.gutka_paan || 0) * 2 + parseInt(form.passive_smoking || 0)) / 8 * 10 * 10) / 10)
  const hygiene = Math.min(10, Math.round((10 - ((parseInt(form.brushing_freq || 2) * 2 + parseInt(form.oral_hygiene_score || 3) + parseInt(form.flossing || 0) + parseInt(form.mouthwash || 0)) / 10 * 10)) * 10) / 10)
  const lifestyle = Math.min(10, Math.round(((parseInt(form.stress_level || 5) / 10) + (1 - (parseFloat(form.sleep_hours || 7) - 4) / 5)) / 2 * 10 * 10) / 10)
  const medical = Math.min(10, Math.round((parseInt(form.family_history || 0) * 3 + parseInt(form.diabetes || 0) * 2 + parseInt(form.hpv_known || 0)) / 6 * 10 * 10) / 10)
  return [symptoms, habits, Math.max(0, hygiene), lifestyle, medical]
}

function getRecommendations(form = {}) {
  const recommendations = []
  const hasTobaccoHabit = Number(form.smoking) > 0 || Number(form.vaping) > 0 || Number(form.gutka_paan) > 0
  const hasAlcoholHabit = Number(form.alcohol) > 0
  const hasSymptoms = ['mouth_ulcers', 'white_patches', 'mouth_pain', 'difficulty_swallowing', 'swelling_lumps', 'voice_change']
    .some(field => Number(form[field]) > 0)

  if (hasTobaccoHabit || hasAlcoholHabit) {
    recommendations.push('If you use tobacco, vaping products, gutka or alcohol, consider discussing practical ways to reduce or stop with a healthcare professional.')
  }
  if (hasSymptoms) {
    recommendations.push('If symptoms such as patches, ulcers, a lump or voice changes persist, arrange a check with a dentist or doctor to understand the cause.')
  }
  if (form.dental_visits === 'never' || form.dental_visits === 'problem_only') {
    recommendations.push('Consider scheduling a routine dental check-up, even when nothing feels wrong. A clinician can answer questions specific to you.')
  }
  if (Number(form.brushing_freq) < 2 || Number(form.flossing) === 0) {
    recommendations.push('A steady oral-care routine can help: brush twice daily with fluoride toothpaste and clean between teeth as advised by your dentist.')
  }
  if (!recommendations.length) {
    recommendations.push('Keep up the habits that support your oral health and consider regular check-ups with a qualified dental professional.')
  }
  return recommendations.slice(0, 4)
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card" style={{ padding: '9px 12px', fontSize: 11 }}>
      <strong>{payload[0].payload.category}</strong>
      <div style={{ color: '#b7c3df', marginTop: 2 }}>Score: {payload[0].value} / 10</div>
    </div>
  )
}

export default function Results() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const radarRef = useRef(null)
  const [dlLoading, setDlLoading] = useState(false)
  const [showAllFactors, setShowAllFactors] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!state?.result) navigate('/', { replace: true })
  }, [navigate, state])

  const result = state?.result
  const form = state?.form
  const risk = result?.risk || 'Low'
  const prob = Math.round((result?.probability || 0) * 100)
  const factors = result?.top_factors || []
  const recommendations = getRecommendations(form)
  const radarScores = getRadarScores(form)
  const radarData = categoryNames.map((category, index) => ({ category, score: radarScores[index] }))
  const maxImpact = Math.max(...factors.map(factor => Math.abs(factor.impact || 0)), 0.01)
  const visibleFactors = showAllFactors ? factors : factors.slice(0, 8)

  const riskConfig = {
    Low: { color: '#34d399', tint: 'rgba(52,211,153,.12)', icon: CheckCircle2, summary: 'Your answers show a lower model-estimated risk profile. Keep up your oral care and check in with a professional when you have concerns.' },
    Medium: { color: '#fbbf24', tint: 'rgba(251,191,36,.12)', icon: Activity, summary: 'Your answers show some factors worth keeping in mind. Small supportive steps and regular check-ups can help you stay informed.' },
    High: { color: '#fb7185', tint: 'rgba(251,113,133,.12)', icon: ShieldAlert, summary: 'Your answers include factors that may be worth discussing with a dentist or doctor. This score is not a diagnosis or a substitute for care.' },
  }
  const config = riskConfig[risk] || riskConfig.Low
  const RiskIcon = config.icon

  const downloadPDF = async () => {
    setDlLoading(true)
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = 210
      const pageH = 297
      const margin = 16
      const badgeColors = { Low: [220, 252, 231], Medium: [254, 249, 195], High: [255, 228, 230] }
      const badgeTextColors = { Low: [22, 101, 52], Medium: [133, 77, 14], High: [159, 18, 57] }
      const badgeColor = badgeColors[risk] || badgeColors.Low
      const badgeTextColor = badgeTextColors[risk] || badgeTextColors.Low

      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, pageW, 28, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text('OralGuard - Risk Awareness Report', margin, 18)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(203, 213, 225)
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}  |  Awareness tool, not a diagnosis`, margin, 24)

      pdf.setFillColor(...badgeColor)
      pdf.roundedRect(margin, 34, pageW - margin * 2, 28, 4, 4, 'F')
      pdf.setTextColor(...badgeTextColor)
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${risk} Risk`, margin + 8, 51)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Confidence Score: ${prob}%`, margin + 80, 51)
      pdf.setFontSize(9)
      pdf.text(`XGBoost Model | SHAP explainability | ${factors.length} factors identified`, margin + 8, 58)

      let yPos = 70
      if (radarRef.current) {
        radarRef.current.classList.add('pdf-chart-mode')
        let radarImage
        try {
          const imageCanvas = await html2canvas(radarRef.current, { backgroundColor: '#ffffff', scale: 2, logging: false })
          radarImage = imageCanvas.toDataURL('image/png', 1)
        } finally {
          radarRef.current.classList.remove('pdf-chart-mode')
        }
        pdf.setTextColor(15, 23, 42)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Risk Radar - Category Breakdown', margin, yPos)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(100, 116, 139)
        pdf.text('Risk score across five categories (0-10)', margin, yPos + 5)
        pdf.addImage(radarImage, 'PNG', margin + 8, yPos + 9, 94, 70)

        const tableX = margin + 110
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(15, 23, 42)
        pdf.text('Category Scores', tableX, yPos + 15)
        categoryNames.forEach((label, index) => {
          const score = radarScores[index]
          const scoreColor = score > 7 ? [225, 29, 72] : score > 4 ? [217, 119, 6] : [5, 150, 105]
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(55, 65, 81)
          pdf.text(label, tableX, yPos + 24 + index * 11)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(...scoreColor)
          pdf.text(`${score}/10`, tableX + 40, yPos + 24 + index * 11)
          pdf.setDrawColor(226, 232, 240)
          pdf.setFillColor(241, 245, 249)
          pdf.roundedRect(tableX, yPos + 26 + index * 11, 42, 3, 1, 1, 'F')
          pdf.setFillColor(...scoreColor)
          pdf.roundedRect(tableX, yPos + 26 + index * 11, Math.max(2, score * 4.2), 3, 1, 1, 'F')
        })
        yPos += 89
      }

      if (factors.length) {
        pdf.setTextColor(15, 23, 42)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('SHAP Factor Analysis', margin, yPos)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(100, 116, 139)
        pdf.text('How answers influenced the model score (not medical cause)', margin, yPos + 5)
        yPos += 12

        factors.slice(0, 8).forEach((factor, index) => {
          if (yPos > pageH - 28) return
          const isIncrease = factor.direction === 'increases risk'
          const barColor = isIncrease ? [225, 29, 72] : [5, 150, 105]
          const barWidth = Math.round((Math.abs(factor.impact || 0) / maxImpact) * 58)
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(9)
          pdf.setTextColor(55, 65, 81)
          pdf.text(`${index + 1}. ${factor.display_name || factor.feature}`, margin, yPos)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(...barColor)
          pdf.text(`${isIncrease ? 'Increases' : 'Decreases'} risk  |  ${Math.abs(factor.impact || 0).toFixed(2)}`, margin + 85, yPos)
          pdf.setFillColor(241, 245, 249)
          pdf.roundedRect(margin, yPos + 2, 100, 4, 2, 2, 'F')
          pdf.setFillColor(...barColor)
          pdf.roundedRect(margin, yPos + 2, Math.max(2, barWidth), 4, 2, 2, 'F')
          yPos += 13
        })
      }

      pdf.addPage()
      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, pageW, 18, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('OralGuard - Supportive Next Steps', margin, 12)

      yPos = 30
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Suggestions based on your responses', margin, yPos)
      yPos += 10
      recommendations.forEach((recommendation, index) => {
        const lines = pdf.splitTextToSize(recommendation, pageW - margin * 2 - 22)
        const cardHeight = lines.length * 5 + 12
        pdf.setFillColor(239, 246, 255)
        pdf.roundedRect(margin, yPos, pageW - margin * 2, cardHeight, 4, 4, 'F')
        pdf.setFillColor(37, 99, 235)
        pdf.circle(margin + 7, yPos + cardHeight / 2, 4, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${index + 1}`, margin + 5.5, yPos + cardHeight / 2 + 1)
        pdf.setTextColor(30, 58, 138)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.text(lines, margin + 15, yPos + 8)
        yPos += cardHeight + 7
      })

      yPos += 8
      pdf.setFillColor(248, 250, 252)
      pdf.setDrawColor(226, 232, 240)
      pdf.roundedRect(margin, yPos, pageW - margin * 2, 40, 4, 4, 'FD')
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Remember', margin + 8, yPos + 10)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(55, 65, 81)
      pdf.text(pdf.splitTextToSize('This report is for awareness, not diagnosis. If you have concerns or persistent symptoms, please speak with a qualified dentist or doctor.', pageW - margin * 2 - 16), margin + 8, yPos + 19)

      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, pageH - 14, pageW, 14, 'F')
      pdf.setTextColor(203, 213, 225)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text('OralGuard | AI-powered oral health awareness', margin, pageH - 5)
      pdf.text('Page 2 of 2', pageW - margin - 16, pageH - 5)
      pdf.save(`OralGuard_Risk_Report_${risk}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (error) {
      console.error('PDF error:', error)
      window.alert('Could not generate PDF. Please try again.')
    } finally {
      setDlLoading(false)
    }
  }

  if (!result) return null

  return (
    <div className="page-shell results-page">
      <header className="site-nav">
        <div className="container nav-inner">
          <button type="button" className="brand" onClick={() => navigate('/')} aria-label="OralGuard home">
            <span className="brand-mark"><ShieldCheck size={18} /></span><span>OralGuard</span>
          </button>
          <button className="btn-primary" onClick={downloadPDF} disabled={dlLoading}>
            <Download size={15} /> {dlLoading ? 'Preparing report…' : 'Download Report'}
          </button>
        </div>
      </header>

      <main className="container results-content">
        <motion.p className="results-kicker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>Your OralGuard report</motion.p>

        <motion.section className="results-hero glass-card" style={{ '--risk-color': config.color }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .35 }}>
          <motion.div className="confidence-gauge" style={{ '--gauge-progress': `${prob * 3.6}deg` }} initial={{ rotate: -90 }} animate={{ rotate: 0 }} transition={{ duration: reduceMotion ? 0 : .8, ease: 'easeOut' }}>
            <div className="gauge-inner">
              <span className="gauge-value"><AnimatedNumber value={prob} suffix="%" /></span>
              <span className="gauge-caption">confidence</span>
            </div>
          </motion.div>
          <div className="results-hero-copy">
            <p className="eyebrow"><RiskIcon size={14} /> AI risk assessment</p>
            <h1>{risk} Risk</h1>
            <p>{config.summary}</p>
            <div className="results-tags">
              <span className="chip"><ShieldCheck size={12} /> Awareness result</span>
              <span className="chip"><Sparkles size={12} /> SHAP explainable</span>
              <span className="chip"><Activity size={12} /> {factors.length} factors found</span>
            </div>
          </div>
        </motion.section>

        <section className="metric-grid" aria-label="Risk summary">
          {[
            { label: 'Risk Level', value: risk, color: config.color },
            { label: 'Confidence', value: <AnimatedNumber value={prob} suffix="%" />, color: '#a5b4fc' },
            { label: 'Factors Found', value: <AnimatedNumber value={factors.length} />, color: '#67e8f9' },
          ].map(metric => (
            <motion.article className="metric-card glass-card" key={metric.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0 : .35 }}>
              <span className="metric-label">{metric.label}</span>
              <span className="metric-value" style={{ color: metric.color }}>{metric.value}</span>
            </motion.article>
          ))}
        </section>

        <motion.section className="results-card glass-card" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }}>
          <div className="card-heading"><h2><Activity size={18} style={{ color: '#a5b4fc', verticalAlign: 'middle', marginRight: 8 }} />Risk radar</h2><span className="chip">5 categories</span></div>
          <p className="card-subtitle">A profile view based on your answers. Higher scores indicate more factors in that category.</p>
          <div className="radar-wrap" ref={radarRef}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%" margin={{ top: 18, right: 37, bottom: 18, left: 37 }}>
                <defs>
                  <linearGradient id="risk-radar-fill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity=".64" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity=".24" />
                  </linearGradient>
                </defs>
                <PolarGrid stroke="rgba(182,194,225,.2)" />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#c5cde0', fontSize: 10, fontWeight: 600 }} />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#7f8ba8', fontSize: 8 }} axisLine={false} />
                <Radar name="Your profile" dataKey="score" stroke="#8b7bff" strokeWidth={2} fill="url(#risk-radar-fill)" fillOpacity={.8} dot={{ r: 3, fill: '#22d3ee', stroke: '#c4b5fd', strokeWidth: 1 }} />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="score-bars">
            {categoryNames.map((category, index) => (
              <div className="score-item" key={category}>
                <div className="score-meta"><span>{category}</span><strong>{radarScores[index]}</strong></div>
                <div className="score-track"><motion.span initial={{ width: 0 }} whileInView={{ width: `${radarScores[index] * 10}%` }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0 : .7, delay: index * .06 }} /></div>
              </div>
            ))}
          </div>
        </motion.section>

        {factors.length > 0 && (
          <motion.section className="results-card glass-card" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }}>
            <div className="shap-intro">
              <div>
                <div className="card-heading"><h2><Sparkles size={18} style={{ color: '#a5b4fc', verticalAlign: 'middle', marginRight: 8 }} />What influenced your score</h2></div>
                <p className="card-subtitle">SHAP factor analysis · sorted by impact</p>
              </div>
              <span className="info-tip" title="SHAP shows how much each answer pushed the model's score up or down. It explains the model, not medical cause.">
                <Info size={14} /> About SHAP
              </span>
            </div>
            <p className="card-subtitle">SHAP shows how much each answer pushed the model's score up or down. It explains the model, not medical cause.</p>
            <div className="shap-list">
              {visibleFactors.map((factor, index) => {
                const increases = factor.direction === 'increases risk'
                const width = `${Math.max(3, (Math.abs(factor.impact || 0) / maxImpact) * 100)}%`
                return (
                  <motion.div className="shap-row" key={`${factor.feature}-${index}`} initial={{ opacity: 0, x: increases ? -8 : 8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * .05 }}>
                    <div>
                      <div className="shap-name" title={factor.display_name || factor.feature}>{factor.display_name || factor.feature}</div>
                      <div className="shap-direction" style={{ color: increases ? '#fb7185' : '#34d399' }}>{increases ? 'Increases risk' : 'Decreases risk'}</div>
                      <div className="shap-diverge">
                        <span className="shap-side left">{!increases && <span className="shap-fill decrease" style={{ '--impact-width': width }} />}</span>
                        <span className="shap-center" />
                        <span className="shap-side right">{increases && <span className="shap-fill increase" style={{ '--impact-width': width }} />}</span>
                      </div>
                    </div>
                    <span className="shap-impact">{Math.abs(factor.impact || 0).toFixed(2)}</span>
                  </motion.div>
                )
              })}
            </div>
            {factors.length > 8 && (
              <button className="show-all-button" onClick={() => setShowAllFactors(previous => !previous)} type="button">
                {showAllFactors ? 'Show top 8' : `Show all ${factors.length} factors`} <ArrowRight size={13} />
              </button>
            )}
          </motion.section>
        )}

        <motion.section className="results-card glass-card" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }}>
          <div className="card-heading"><h2><Heart size={18} style={{ color: '#fb7185', verticalAlign: 'middle', marginRight: 8 }} />What you can do</h2></div>
          <p className="card-subtitle">Supportive ideas based on the answers you shared. Choose what feels useful to discuss with a professional.</p>
          <div className="recommendation-grid">
            {recommendations.map((recommendation, index) => (
              <motion.article className="recommendation-card" key={recommendation} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .08 }}>
                <span className="recommendation-icon">{index === 0 ? <Stethoscope size={16} /> : index === 1 ? <HeartPulse size={16} /> : <CheckCircle2 size={16} />}</span>
                <p>{recommendation}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <div className="result-disclaimer">
          <TriangleAlert size={18} />
          <p><strong>OralGuard is an awareness tool, not a medical diagnosis.</strong> Please consult a qualified dentist or doctor about any health concerns. The result is a model estimate based on your self-reported answers.</p>
        </div>

        <div className="result-actions">
          <button className="btn-primary" onClick={downloadPDF} disabled={dlLoading}><Download size={15} /> {dlLoading ? 'Preparing report…' : 'Download Report'}</button>
          <button className="btn-ghost" onClick={() => navigate('/assess')}><ArrowLeft size={15} /> Retake Assessment</button>
          <span className="save-placeholder" aria-disabled="true"><ShieldCheck size={15} /> Save to my account · Coming later</span>
          <button className="btn-ghost" onClick={() => navigate('/')}><ArrowRight size={15} /> Home</button>
        </div>
      </main>
    </div>
  )
}
