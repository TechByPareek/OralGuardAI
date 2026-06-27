import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

export default function AssessmentForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    age_group: '', gender: '', occupation: '', location: '',
    smoking: '0', vaping: '0', alcohol: '0', gutka_paan: '0',
    substance_duration: 'Never', brushing_freq: '2',
    dental_visits: 'yearly', oral_hygiene_score: '3',
    mouth_ulcers: '0', white_patches: '0', mouth_pain: '0',
    difficulty_swallowing: '0', swelling_lumps: '0', voice_change: '0',
    stress_level: '5', sleep_hours: '7',
    family_history: '0', hpv_known: '0', diabetes: '0',
    passive_smoking: '0', flossing: '0', mouthwash: '0',
    processed_food: 'medium', sugary_drinks: 'medium', fruit_veg_intake: 'medium'
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const validate = () => {
    if (step === 1) {
      if (!form.age_group) { setError('Please select your age group.'); return false }
      if (!form.gender) { setError('Please select your gender.'); return false }
      if (!form.occupation.trim()) { setError('Please enter your occupation.'); return false }
      if (!form.location.trim()) { setError('Please enter your city.'); return false }
    }
    setError(''); return true
  }

  const handleNext = () => { if (validate()) setStep(s => s + 1) }
  const handleBack = () => { setError(''); setStep(s => s - 1) }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true); setError('')
    try {
      const payload = {
        ...form,
        smoking: parseInt(form.smoking), vaping: parseInt(form.vaping),
        alcohol: parseInt(form.alcohol), gutka_paan: parseInt(form.gutka_paan),
        brushing_freq: parseInt(form.brushing_freq),
        oral_hygiene_score: parseInt(form.oral_hygiene_score),
        mouth_ulcers: parseInt(form.mouth_ulcers),
        white_patches: parseInt(form.white_patches),
        mouth_pain: parseInt(form.mouth_pain),
        difficulty_swallowing: parseInt(form.difficulty_swallowing),
        swelling_lumps: parseInt(form.swelling_lumps),
        voice_change: parseInt(form.voice_change),
        stress_level: parseInt(form.stress_level),
        sleep_hours: parseFloat(form.sleep_hours),
        family_history: parseInt(form.family_history),
        hpv_known: parseInt(form.hpv_known),
        diabetes: parseInt(form.diabetes),
        passive_smoking: parseInt(form.passive_smoking),
        flossing: parseInt(form.flossing),
        mouthwash: parseInt(form.mouthwash),
      }
      const res = await axios.post(`${API_URL}/predict`, payload)
      navigate('/results', { state: { result: res.data, form } })
    } catch (e) {
      setError(e.code === 'ERR_NETWORK'
        ? 'Cannot connect to backend. Make sure uvicorn is running on port 8000.'
        : `Error: ${e.response?.data?.detail || e.message}`)
    } finally { setLoading(false) }
  }

  const OptionCard = ({ field, value, icon, label, sub, danger }) => {
    const selected = String(form[field]) === String(value)
    return (
      <div className={`option-card ${selected ? (danger ? 'selected-danger' : 'selected') : ''}`}
        onClick={() => update(field, value)}>
        <div className="option-icon">{icon}</div>
        <div className="option-label" style={{ color: selected ? (danger ? '#991b1b' : '#1d4ed8') : '#374151' }}>{label}</div>
        {sub && <div className="option-sub">{sub}</div>}
      </div>
    )
  }

  const SliderField = ({ label, field, min, max, step: s = 1, format }) => (
    <div className="slider-group">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{format ? format(form[field]) : form[field]}</span>
      </div>
      <input type="range" min={min} max={max} step={s}
        value={form[field]} onChange={e => update(field, e.target.value)} />
    </div>
  )

  const stepTitles = ['👤 About You', '🚬 Habits & Hygiene', '🩺 Symptoms & History']
  const stepDescs = ['Tell us a bit about yourself.', 'Your lifestyle significantly affects oral health.', 'Any symptoms or medical history to note.']

  return (
    <div>
      <nav className="navbar">
        <span className="navbar-brand" onClick={() => navigate('/')}>🦷 OralGuard</span>
        <span style={{ color: '#94a3b8', fontSize: '13px' }}>Step {step} of 3</span>
      </nav>

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '48px' }}>
        {/* Progress */}
        <div className="progress-wrapper">
          <div className="progress-steps">
            {[1,2,3].map(n => (
              <div key={n} className={`progress-step ${n <= step ? 'active' : ''}`} />
            ))}
          </div>
          <div className="progress-meta">
            <span>{stepTitles[step-1].replace(/^.+ /, '')}</span>
            <span>{step}/3 complete</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">{stepTitles[step-1]}</div>
          <div className="card-subtitle">{stepDescs[step-1]}</div>

          {/* STEP 1 */}
          {step === 1 && <>
            <div className="section-label">Basic info</div>
            <div className="form-group">
              <label className="form-label">Age Group *</label>
              <div className="option-grid">
                {[['18-20','18–20'],['21-23','21–23'],['24-27','24–27']].map(([v,l]) => (
                  <div key={v} className={`option-card ${form.age_group===v?'selected':''}`}
                    onClick={() => update('age_group', v)}>
                    <div className="option-icon">🎓</div>
                    <div className="option-label" style={{ color: form.age_group===v?'#1d4ed8':'#374151' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Gender *</label>
              <div className="option-grid">
                {[['Male','👦','Male'],['Female','👧','Female'],['Other','🧑','Other']].map(([v,icon,l]) => (
                  <div key={v} className={`option-card ${form.gender===v?'selected':''}`}
                    onClick={() => update('gender', v)}>
                    <div className="option-icon">{icon}</div>
                    <div className="option-label" style={{ color: form.gender===v?'#1d4ed8':'#374151' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Occupation *</label>
              <input className="form-input" type="text"
                placeholder="e.g. Undergraduate Student, Working Professional..."
                value={form.occupation} onChange={e => update('occupation', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">City *</label>
              <input className="form-input" type="text"
                placeholder="e.g. Delhi, Mumbai, Bangalore..."
                value={form.location} onChange={e => update('location', e.target.value)} />
            </div>
          </>}

          {/* STEP 2 */}
          {step === 2 && <>
            <div className="section-label">Substance use</div>
            <div className="form-group">
              <label className="form-label">Smoking</label>
              <div className="option-grid">
                <OptionCard field="smoking" value="0" icon="✅" label="Never" />
                <OptionCard field="smoking" value="1" icon="🚬" label="Occasionally" danger />
                <OptionCard field="smoking" value="2" icon="⚠️" label="Regularly" danger />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Vaping / E-cigarettes</label>
              <div className="option-grid">
                <OptionCard field="vaping" value="0" icon="✅" label="Never" />
                <OptionCard field="vaping" value="1" icon="💨" label="Occasionally" danger />
                <OptionCard field="vaping" value="2" icon="⚠️" label="Regularly" danger />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Alcohol</label>
              <div className="option-grid">
                <OptionCard field="alcohol" value="0" icon="✅" label="Never" />
                <OptionCard field="alcohol" value="1" icon="🍺" label="Social" danger />
                <OptionCard field="alcohol" value="2" icon="⚠️" label="Regularly" danger />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Gutka / Paan / Betel Nut</label>
              <div className="option-grid">
                <OptionCard field="gutka_paan" value="0" icon="✅" label="Never" />
                <OptionCard field="gutka_paan" value="1" icon="🌿" label="Yes" danger />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Passive Smoking</label>
              <div className="option-grid">
                <OptionCard field="passive_smoking" value="0" icon="✅" label="Not exposed" />
                <OptionCard field="passive_smoking" value="1" icon="😷" label="Regularly exposed" danger />
              </div>
            </div>

            <div className="section-label">Oral hygiene</div>
            <SliderField label="Brushing Frequency (times/day)" field="brushing_freq" min={0} max={2}
              format={v => v === '0' ? 'Rarely' : v === '1' ? '1× daily' : '2× daily'} />
            <SliderField label="Oral Hygiene Rating (self-assessed)" field="oral_hygiene_score" min={1} max={5}
              format={v => `${v} / 5`} />

            <div className="form-group">
              <label className="form-label">Dental Visits</label>
              <select className="form-select" value={form.dental_visits}
                onChange={e => update('dental_visits', e.target.value)}>
                <option value="never">Never</option>
                <option value="problem_only">Only when there is a problem</option>
                <option value="yearly">Once a year</option>
                <option value="sixmonthly">Every 6 months</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Do you floss?</label>
              <div className="option-grid">
                <OptionCard field="flossing" value="0" icon="❌" label="No" />
                <OptionCard field="flossing" value="1" icon="✅" label="Yes" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Do you use mouthwash?</label>
              <div className="option-grid">
                <OptionCard field="mouthwash" value="0" icon="❌" label="No" />
                <OptionCard field="mouthwash" value="1" icon="✅" label="Yes" />
              </div>
            </div>
          </>}

          {/* STEP 3 */}
          {step === 3 && <>
            <div className="section-label">Current symptoms</div>
            <div className="form-group">
              <label className="form-label">Mouth Ulcers (past 6 months)</label>
              <div className="option-grid">
                <OptionCard field="mouth_ulcers" value="0" icon="✅" label="None" />
                <OptionCard field="mouth_ulcers" value="1" icon="😬" label="Occasionally" danger />
                <OptionCard field="mouth_ulcers" value="2" icon="⚠️" label="Frequently" danger />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">White / Red Patches in Mouth</label>
              <div className="option-grid">
                <OptionCard field="white_patches" value="0" icon="✅" label="None" />
                <OptionCard field="white_patches" value="1" icon="🤔" label="Not sure" danger />
                <OptionCard field="white_patches" value="2" icon="⚠️" label="Yes" danger />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mouth Pain / Soreness</label>
              <div className="option-grid">
                <OptionCard field="mouth_pain" value="0" icon="✅" label="None" />
                <OptionCard field="mouth_pain" value="1" icon="😣" label="Mild" danger />
                <OptionCard field="mouth_pain" value="2" icon="⚠️" label="Severe" danger />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Difficulty Swallowing</label>
              <div className="option-grid">
                <OptionCard field="difficulty_swallowing" value="0" icon="✅" label="None" />
                <OptionCard field="difficulty_swallowing" value="1" icon="😰" label="Sometimes" danger />
                <OptionCard field="difficulty_swallowing" value="2" icon="⚠️" label="Often" danger />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Swelling / Lumps in Mouth or Neck</label>
              <div className="option-grid">
                <OptionCard field="swelling_lumps" value="0" icon="✅" label="None" />
                <OptionCard field="swelling_lumps" value="1" icon="🤔" label="Not sure" danger />
                <OptionCard field="swelling_lumps" value="2" icon="⚠️" label="Yes" danger />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Voice Changes / Hoarseness</label>
              <div className="option-grid">
                <OptionCard field="voice_change" value="0" icon="✅" label="None" />
                <OptionCard field="voice_change" value="1" icon="🗣️" label="Sometimes" danger />
                <OptionCard field="voice_change" value="2" icon="⚠️" label="Often" danger />
              </div>
            </div>

            <div className="section-label">Lifestyle</div>
            <SliderField label="Stress Level" field="stress_level" min={1} max={10}
              format={v => `${v} / 10`} />
            <SliderField label="Average Sleep" field="sleep_hours" min={4} max={9} s={0.5}
              format={v => `${v}h`} />

            <div className="section-label">Diet</div>
            {[
              { field: 'processed_food', label: 'Processed / Junk Food' },
              { field: 'sugary_drinks', label: 'Sugary Drinks' },
              { field: 'fruit_veg_intake', label: 'Fruit & Vegetable Intake' },
            ].map(({ field, label }) => (
              <div key={field} className="form-group">
                <label className="form-label">{label}</label>
                <div className="option-grid">
                  <OptionCard field={field} value="low" icon="🟢" label="Low" />
                  <OptionCard field={field} value="medium" icon="🟡" label="Medium" />
                  <OptionCard field={field} value="high" icon="🔴" label="High"
                    danger={field !== 'fruit_veg_intake'} />
                </div>
              </div>
            ))}

            <div className="section-label">Medical history</div>
            <div className="form-group">
              <label className="form-label">Family History of Cancer</label>
              <div className="option-grid">
                <OptionCard field="family_history" value="0" icon="✅" label="No" />
                <OptionCard field="family_history" value="1" icon="🧬" label="Yes" danger />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Diagnosed with Diabetes</label>
              <div className="option-grid">
                <OptionCard field="diabetes" value="0" icon="✅" label="No" />
                <OptionCard field="diabetes" value="1" icon="💉" label="Yes" danger />
              </div>
            </div>
          </>}

          {error && <div className="error-box">⚠️ {error}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            {step > 1
              ? <button className="btn-secondary" onClick={handleBack}>← Back</button>
              : <span />
            }
            {step < 3
              ? <button className="btn-primary" onClick={handleNext}>Next Step →</button>
              : <button className="btn-primary" onClick={handleSubmit} disabled={loading}
                  style={{ opacity: loading ? 0.7 : 1, minWidth: '180px' }}>
                  {loading ? '⏳ Analysing...' : '🔍 Get My Report'}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}