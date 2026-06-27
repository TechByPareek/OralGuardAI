import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Chart, RadarController, LineElement, PointElement, RadialLinearScale, Filler, Tooltip, DoughnutController, ArcElement } from 'chart.js'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

Chart.register(RadarController, LineElement, PointElement, RadialLinearScale, Filler, Tooltip, DoughnutController, ArcElement)

export default function Results() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const radarRef = useRef(null)
  const doughnutRef = useRef(null)
  const radarChart = useRef(null)
  const doughnutChart = useRef(null)
  const reportRef = useRef(null)
  const [dlLoading, setDlLoading] = useState(false)

  if (!state?.result) {
    navigate('/')
    return null
  }

  const { result, form } = state
  const risk = result.risk
  const prob = Math.round((result.probability || 0) * 100)
  const factors = result.top_factors || []

  const riskConfig = {
    Low:    { bg: 'linear-gradient(135deg, #052e16, #166534)', text: '#dcfce7', sub: '#86efac', emoji: '✅', color: '#22c55e' },
    Medium: { bg: 'linear-gradient(135deg, #431407, #92400e)', text: '#fef9c3', sub: '#fde047', emoji: '⚠️', color: '#f59e0b' },
    High:   { bg: 'linear-gradient(135deg, #450a0a, #991b1b)', text: '#fee2e2', sub: '#fca5a5', emoji: '🚨', color: '#ef4444' },
  }
  const c = riskConfig[risk] || riskConfig['Low']
  const radarColor = c.color

  const getRadarScores = () => {
    const f = form || {}
    const symptoms = Math.min(10, Math.round((parseInt(f.mouth_ulcers||0) + parseInt(f.white_patches||0) + parseInt(f.mouth_pain||0) + parseInt(f.difficulty_swallowing||0) + parseInt(f.swelling_lumps||0) + parseInt(f.voice_change||0)) / 12 * 10 * 10) / 10)
    const habits = Math.min(10, Math.round((parseInt(f.smoking||0) + parseInt(f.vaping||0) + parseInt(f.alcohol||0) + parseInt(f.gutka_paan||0)*2 + parseInt(f.passive_smoking||0)) / 8 * 10 * 10) / 10)
    const hygiene = Math.min(10, Math.round((10 - ((parseInt(f.brushing_freq||2)*2 + parseInt(f.oral_hygiene_score||3) + parseInt(f.flossing||0) + parseInt(f.mouthwash||0)) / 10 * 10)) * 10) / 10)
    const lifestyle = Math.min(10, Math.round(((parseInt(f.stress_level||5) / 10) + (1 - (parseFloat(f.sleep_hours||7) - 4) / 5)) / 2 * 10 * 10) / 10)
    const medical = Math.min(10, Math.round((parseInt(f.family_history||0)*3 + parseInt(f.diabetes||0)*2 + parseInt(f.hpv_known||0)) / 6 * 10 * 10) / 10)
    return [symptoms, habits, Math.max(0, hygiene), lifestyle, medical]
  }

  const radarScores = getRadarScores()
  const maxImpact = Math.max(...factors.map(f => Math.abs(f.impact || 0)), 0.01)

  useEffect(() => {
    if (radarRef.current) {
      if (radarChart.current) radarChart.current.destroy()
      radarChart.current = new Chart(radarRef.current, {
        type: 'radar',
        data: {
          labels: ['Symptoms', 'Habits', 'Poor Hygiene', 'Lifestyle', 'Medical Hx'],
          datasets: [{
            label: 'Your Risk Profile',
            data: radarScores,
            backgroundColor: `${radarColor}30`,
            borderColor: radarColor,
            borderWidth: 2.5,
            pointBackgroundColor: radarColor,
            pointRadius: 4,
            pointHoverRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            tooltip: { callbacks: { label: ctx => ` ${ctx.raw} / 10` } },
            legend: { display: false }
          },
          scales: {
            r: {
              min: 0, max: 10,
              ticks: { stepSize: 2, font: { size: 10 }, color: '#94a3b8', backdropColor: 'transparent' },
              grid: { color: '#e2e8f0' },
              angleLines: { color: '#e2e8f0' },
              pointLabels: { font: { size: 12, weight: '700' }, color: '#374151' }
            }
          },
          animation: { duration: 1000, easing: 'easeOutQuart' }
        }
      })
    }

    if (doughnutRef.current) {
      if (doughnutChart.current) doughnutChart.current.destroy()
      doughnutChart.current = new Chart(doughnutRef.current, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [prob, 100 - prob],
            backgroundColor: [radarColor, '#f1f5f9'],
            borderWidth: 0,
            circumference: 270,
            rotation: 225,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '78%',
          plugins: { tooltip: { enabled: false }, legend: { display: false } },
          animation: { duration: 1200, easing: 'easeOutQuart' }
        }
      })
    }

    return () => {
      radarChart.current?.destroy()
      doughnutChart.current?.destroy()
    }
  }, [])

  const downloadPDF = async () => {
    setDlLoading(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = 210
      const pageH = 297
      const margin = 16

      // ── Header ──
      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, pageW, 28, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text('OralGuard — Risk Assessment Report', margin, 18)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(148, 163, 184)
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}  ·  AI-powered · Not a medical diagnosis`, margin, 24)

      // ── Risk badge ──
      const badgeColors = { Low: [220, 252, 231], Medium: [254, 249, 195], High: [254, 226, 226] }
      const badgeTextColors = { Low: [22, 101, 52], Medium: [133, 77, 14], High: [153, 27, 27] }
      const bc = badgeColors[risk] || badgeColors.Low
      const btc = badgeTextColors[risk] || badgeTextColors.Low

      pdf.setFillColor(...bc)
      pdf.roundedRect(margin, 34, pageW - margin*2, 28, 4, 4, 'F')
      pdf.setTextColor(...btc)
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${risk} Risk`, margin + 8, 51)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Confidence Score: ${prob}%`, margin + 80, 51)
      pdf.setFontSize(9)
      pdf.text(`XGBoost Model · SHAP Explainability · ${factors.length} key factors identified`, margin + 8, 58)

      // ── Radar chart screenshot ──
      let yPos = 70
      if (radarRef.current) {
        const radarCanvas = radarRef.current
        const radarImage = radarCanvas.toDataURL('image/png', 1.0)
        pdf.setTextColor(15, 23, 42)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Risk Radar — Category Breakdown', margin, yPos)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(100, 116, 139)
        pdf.text('Risk score across 5 key health categories (0–10, higher = more risk)', margin, yPos + 5)
        pdf.addImage(radarImage, 'PNG', margin + 30, yPos + 8, 90, 90)

        // Radar scores table
        const radarLabels = ['Symptoms', 'Habits', 'Poor Hygiene', 'Lifestyle', 'Medical Hx']
        const tableX = margin + 125
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(15, 23, 42)
        pdf.text('Category Scores', tableX, yPos + 15)
        radarLabels.forEach((label, i) => {
          const score = radarScores[i]
          const scoreColor = score > 7 ? [239, 68, 68] : score > 4 ? [245, 158, 11] : [34, 197, 94]
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(55, 65, 81)
          pdf.text(label, tableX, yPos + 24 + i * 14)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(...scoreColor)
          pdf.text(`${score}/10`, tableX + 42, yPos + 24 + i * 14)
          pdf.setDrawColor(226, 232, 240)
          pdf.setFillColor(241, 245, 249)
          pdf.roundedRect(tableX, yPos + 26 + i * 14, 50, 4, 2, 2, 'F')
          pdf.setFillColor(...scoreColor)
          pdf.roundedRect(tableX, yPos + 26 + i * 14, Math.max(2, score * 5), 4, 2, 2, 'F')
        })
        yPos += 105
      }

      // ── SHAP Factors ──
      if (factors.length > 0) {
        pdf.setTextColor(15, 23, 42)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('SHAP Factor Analysis', margin, yPos)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(100, 116, 139)
        pdf.text('Top factors that influenced your risk prediction', margin, yPos + 5)
        yPos += 12

        factors.forEach((f, i) => {
          const isIncrease = f.direction === 'increases risk'
          const barColor = isIncrease ? [239, 68, 68] : [34, 197, 94]
          const pct = Math.round((Math.abs(f.impact) / maxImpact) * 60)

          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(9)
          pdf.setTextColor(55, 65, 81)
          pdf.text(`${i + 1}. ${f.display_name || f.feature}`, margin, yPos)

          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(...barColor)
          const dirLabel = isIncrease ? '↑ increases risk' : '↓ decreases risk'
          pdf.text(`${dirLabel}  ·  ${Math.abs(f.impact).toFixed(2)}`, margin + 80, yPos)

          pdf.setFillColor(241, 245, 249)
          pdf.roundedRect(margin, yPos + 2, 100, 4, 2, 2, 'F')
          pdf.setFillColor(...barColor)
          pdf.roundedRect(margin, yPos + 2, Math.max(2, pct), 4, 2, 2, 'F')

          yPos += 14
        })
      }

      // ── New page for recommendations ──
      pdf.addPage()

      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, pageW, 18, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('OralGuard — Personalised Recommendations', margin, 12)

      yPos = 28

      if (result.recommendations?.length > 0) {
        pdf.setTextColor(15, 23, 42)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Your Personalised Action Plan', margin, yPos)
        yPos += 10

        result.recommendations.forEach((rec, i) => {
          pdf.setFillColor(239, 246, 255)
          const recLines = pdf.splitTextToSize(rec, pageW - margin*2 - 16)
          const recH = recLines.length * 6 + 10
          pdf.roundedRect(margin, yPos, pageW - margin*2, recH, 4, 4, 'F')
          pdf.setFillColor(37, 99, 235)
          pdf.circle(margin + 7, yPos + recH/2, 5, 'F')
          pdf.setTextColor(255, 255, 255)
          pdf.setFontSize(8)
          pdf.setFont('helvetica', 'bold')
          pdf.text(`${i+1}`, margin + 5.5, yPos + recH/2 + 1)
          pdf.setTextColor(30, 58, 138)
          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'normal')
          pdf.text(recLines, margin + 16, yPos + 7)
          yPos += recH + 8
        })
      }

      // ── Next steps box ──
      yPos += 10
      pdf.setFillColor(248, 250, 252)
      pdf.setDrawColor(226, 232, 240)
      pdf.roundedRect(margin, yPos, pageW - margin*2, 45, 4, 4, 'FD')
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Recommended Next Steps', margin + 8, yPos + 10)
      const steps = [
        '• Schedule a dental checkup within the next 3 months',
        '• Share this report with your dentist at your next visit',
        '• Recheck your risk in 3 months after making lifestyle changes',
        '• Call a dental helpline if you notice new or worsening symptoms',
      ]
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(55, 65, 81)
      steps.forEach((s, i) => pdf.text(s, margin + 8, yPos + 20 + i * 7))

      // ── Disclaimer ──
      yPos += 65
      pdf.setFillColor(254, 249, 195)
      pdf.roundedRect(margin, yPos, pageW - margin*2, 22, 4, 4, 'F')
      pdf.setTextColor(133, 77, 14)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Medical Disclaimer', margin + 8, yPos + 8)
      pdf.setFont('helvetica', 'normal')
      const disclaimer = result.disclaimer || 'This report is generated by an AI model for awareness purposes only. It does not constitute a medical diagnosis. Please consult a qualified dental or medical professional for any health concerns.'
      const dLines = pdf.splitTextToSize(disclaimer, pageW - margin*2 - 16)
      pdf.text(dLines, margin + 8, yPos + 15)

      // ── Footer ──
      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, pageH - 14, pageW, 14, 'F')
      pdf.setTextColor(148, 163, 184)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text('OralGuard · AI-Powered Oral Cancer Risk Assessment · Built on Gen Z primary survey data', margin, pageH - 5)
      pdf.text('Page 2 of 2', pageW - margin - 16, pageH - 5)

      pdf.save(`OralGuard_Risk_Report_${risk}_${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      alert('Could not generate PDF. Please try again.')
    }
    setDlLoading(false)
  }

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh' }} ref={reportRef}>
      <nav className="navbar">
        <span className="navbar-brand" onClick={() => navigate('/')}>🦷 OralGuard</span>
        <button onClick={downloadPDF}
          style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⬇️ Download Report
        </button>
      </nav>

      <div className="container" style={{ paddingTop: '28px', paddingBottom: '48px' }}>

        <p style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '14px' }}>
          OralGuard · AI Risk Assessment Report
        </p>

        {/* Hero */}
        <div style={{ background: c.bg, borderRadius: '16px', padding: '28px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
            <canvas ref={doughnutRef} width="110" height="110" />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -42%)', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'white' }}>{prob}%</div>
              <div style={{ fontSize: '9px', color: c.sub, fontWeight: 600 }}>confidence</div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <div style={{ fontSize: '12px', color: c.sub, fontWeight: 700, marginBottom: '4px', letterSpacing: '0.06em' }}>AI RISK ASSESSMENT</div>
            <div style={{ fontSize: '34px', fontWeight: 900, color: 'white', lineHeight: 1.1 }}>{c.emoji} {risk} Risk</div>
            <div style={{ fontSize: '13px', color: c.sub, marginTop: '6px' }}>XGBoost · SHAP · {factors.length} factors identified</div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {risk === 'Low' && ['Good hygiene','Low symptoms','Healthy habits'].map((t,i) => <span key={i} className="risk-tag">{t}</span>)}
              {risk === 'Medium' && ['Some risk factors','Monitor symptoms','Lifestyle changes'].map((t,i) => <span key={i} className="risk-tag">{t}</span>)}
              {risk === 'High' && ['Multiple risk factors','Symptoms present','See dentist urgently'].map((t,i) => <span key={i} className="risk-tag">{t}</span>)}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="metric-grid">
          {[
            { label: 'Risk Level', value: risk, color: radarColor },
            { label: 'Confidence', value: `${prob}%`, color: '#2563eb' },
            { label: 'Factors Found', value: factors.length, color: '#7c3aed' },
          ].map((m,i) => (
            <div key={i} className="metric-card">
              <div className="metric-label">{m.label}</div>
              <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Radar */}
        <div className="card">
          <div className="card-title">📊 Risk Radar — Category Breakdown</div>
          <div className="card-subtitle">Your risk score across 5 key health categories. Higher = more risk in that area.</div>
          <div className="chart-container" style={{ maxWidth: '380px' }}>
            <canvas ref={radarRef} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px', marginTop: '16px' }}>
            {['Symptoms','Habits','Hygiene','Lifestyle','Medical'].map((label,i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: radarScores[i] > 6 ? '#ef4444' : radarScores[i] > 3 ? '#f59e0b' : '#22c55e' }}>{radarScores[i]}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SHAP */}
        {factors.length > 0 && (
          <div className="card">
            <div className="card-title">🔍 SHAP Factor Analysis</div>
            <div className="card-subtitle">Which specific inputs pushed your score up or down</div>
            {factors.map((f,i) => {
              const pct = Math.round((Math.abs(f.impact) / maxImpact) * 100)
              const isIncrease = f.direction === 'increases risk'
              return (
                <div key={i} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{f.display_name || f.feature}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: isIncrease ? '#ef4444' : '#22c55e' }}>
                      {isIncrease ? '↑ increases risk' : '↓ decreases risk'} · {Math.abs(f.impact).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, background: isIncrease ? '#ef4444' : '#22c55e', height: '8px', borderRadius: '99px', transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
              <span>🔴 Increases risk</span><span>🟢 Decreases risk</span>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations?.length > 0 && (
          <div className="card">
            <div className="card-title">💡 Personalised Recommendations</div>
            <div className="card-subtitle">Based on your highest-impact risk factors</div>
            {result.recommendations.map((rec,i) => (
              <div key={i} className="rec-card">
                <div className="rec-number">{i+1}</div>
                <div className="rec-text">{rec}</div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="disclaimer">
          ⚠️ <strong>Medical Disclaimer:</strong> {result.disclaimer || 'This tool is for awareness only. Please consult a qualified dental professional.'}
        </div>

        {/* Actions */}
        <div className="results-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => navigate('/assess')}>Check Again</button>
          <button className="btn-primary" onClick={downloadPDF}
            style={{ background: '#7c3aed' }}>
            ⬇️ Download PDF Report
          </button>
          <button className="btn-primary" onClick={() => navigate('/')}>← Home</button>
        </div>
      </div>
    </div>
  )
}