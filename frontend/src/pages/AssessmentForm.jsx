import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Activity, ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, HeartPulse, Info, ShieldCheck, Sparkles, UserRound, TriangleAlert, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = 'https://oralguard-api.onrender.com'

const stepTitles = ['About You', 'Habits & Hygiene', 'Symptoms & History']
const stepDescriptions = [
  "Let's start with you. A few basics help us put your answers in context.",
  'Tell us about your habits — no judgement. This is just for awareness.',
  'Last step — any symptoms or health history you would like to share?',
]

const loadingSteps = [
  { icon: '🔌', text: 'Connecting to AI server...', subtext: 'Waking up the backend — this takes ~30 sec after inactivity', color: '#6366f1' },
  { icon: '📋', text: 'Reading your responses...', subtext: 'Processing 29 health and lifestyle inputs', color: '#0ea5e9' },
  { icon: '⚙️', text: 'Preparing data pipeline...', subtext: 'Encoding and scaling your inputs for the ML model', color: '#0ea5e9' },
  { icon: '🤖', text: 'Running XGBoost model...', subtext: 'Analysing your profile across 262 decision trees', color: '#8b5cf6' },
  { icon: '🔍', text: 'Calculating SHAP values...', subtext: 'Finding which factors are driving your risk score', color: '#8b5cf6' },
  { icon: '🗺️', text: 'Mapping your risk radar...', subtext: 'Building your 5-category risk breakdown chart', color: '#ec4899' },
  { icon: '💡', text: 'Generating recommendations...', subtext: 'Personalising health advice based on your top risk factors', color: '#f59e0b' },
  { icon: '📄', text: 'Preparing your report...', subtext: 'Almost done — putting everything together', color: '#22c55e' },
  { icon: '✅', text: 'Your report is ready!', subtext: 'Taking you to your results now...', color: '#22c55e' },
]

function OptionCard({ field, value, icon, label, sub, danger, form, update }) {
  const selected = String(form[field]) === String(value)
  return (
    <button
      type="button"
      className={`option-card${selected ? (danger ? ' selected-danger' : ' selected') : ''}`}
      onClick={() => update(field, value)}
      aria-pressed={selected}
    >
      <span className="option-icon"><span className="option-icon-emoji" aria-hidden="true">{icon}</span></span>
      <span className="option-label">{label}</span>
      {sub && <span className="option-sub">{sub}</span>}
      {selected && <span className="selected-check" aria-hidden="true"><Check size={12} /></span>}
    </button>
  )
}

function YesNo({ field, form, update, yesLabel = 'Yes', noLabel = 'No' }) {
  const isYes = String(form[field]) === '1'
  return (
    <div className="yes-no-row" role="group" aria-label="Choose yes or no">
      <span className={`yes-no-thumb${isYes ? ' is-yes' : ''}`} aria-hidden="true" />
      {[['0', noLabel], ['1', yesLabel]].map(([value, label]) => {
        const selected = String(form[field]) === value
        return (
          <button
            type="button"
            className={`yes-no-option${selected ? ' selected' : ''}`}
            key={value}
            aria-pressed={selected}
            onClick={() => update(field, value)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function SliderField({ label, field, min, max, step = 1, form, update, format, emoji }) {
  const numeric = Number(form[field])
  const percent = ((numeric - min) / (max - min)) * 100
  const bubblePosition = Math.min(92, Math.max(8, percent))
  const liveEmoji = typeof emoji === 'function' ? emoji(numeric) : emoji
  return (
    <div className="slider-group">
      <div className="slider-header">
        <label className="form-label" htmlFor={field}>{label}</label>
      </div>
      <div className="slider-control" style={{ '--range-fill': `linear-gradient(90deg, #7c3aed 0%, #2563eb ${percent}%, rgba(255,255,255,.1) ${percent}%)` }}>
        <span className="slider-value-bubble" style={{ left: `${bubblePosition}%` }}>{liveEmoji} {format ? format(form[field]) : form[field]}</span>
        <input id={field} type="range" min={min} max={max} step={step} value={form[field]} onChange={event => update(field, event.target.value)} />
      </div>
    </div>
  )
}

function FieldSection({ icon: Icon, children, title }) {
  return (
    <section className="form-section" aria-label={title}>
      <h3 className="section-label"><Icon size={14} />{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, children }) {
  return <div className="form-group"><span className="form-label">{label}</span>{children}</div>
}

export default function AssessmentForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cities, setCities] = useState([])
  const [loadingStep, setLoadingStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const assessmentScrollRef = useRef(null)
  const stepHeadingRef = useRef(null)
  const reduceMotion = useReducedMotion()

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
    processed_food: 'medium', sugary_drinks: 'medium', fruit_veg_intake: 'medium',
  })

  const update = (field, value) => setForm(previous => ({ ...previous, [field]: value }))

  useEffect(() => {
    fetch('https://countriesnow.space/api/v0.1/countries/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'India' }),
    })
      .then(response => response.json())
      .then(data => {
        if (data?.data) setCities(data.data.sort())
      })
      .catch(() => setCities([
        'Ahmedabad', 'Bangalore', 'Bhopal', 'Chandigarh',
        'Chennai', 'Delhi', 'Gurgaon', 'Hyderabad', 'Indore',
        'Jaipur', 'Kolkata', 'Lucknow', 'Mumbai', 'Nagpur',
        'Noida', 'Pune', 'Surat', 'Vadodara', 'Visakhapatnam',
      ]))
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    const wrapper = assessmentScrollRef.current
    if (wrapper) {
      wrapper.scrollTop = 0
      wrapper.querySelectorAll('*').forEach(element => {
        const style = window.getComputedStyle(element)
        if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight) {
          element.scrollTop = 0
        }
      })
    }
    requestAnimationFrame(() => stepHeadingRef.current?.focus({ preventScroll: true }))
  }, [step, reduceMotion])

  const validate = () => {
    if (step === 1) {
      if (!form.age_group) { setError('Please select your age group.'); return false }
      if (!form.gender) { setError('Please select your gender.'); return false }
      if (!form.occupation.trim()) { setError('Please enter your occupation.'); return false }
      if (!form.location.trim()) { setError('Please enter your city.'); return false }
    }
    setError('')
    return true
  }

  const handleNext = () => {
    if (validate()) {
      setDirection(1)
      setStep(current => current + 1)
    }
  }

  const handleBack = () => {
    setError('')
    setDirection(-1)
    setStep(current => current - 1)
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    setError('')
    setLoadingStep(0)
    const stepInterval = setInterval(() => {
      setLoadingStep(previous => {
        if (previous < loadingSteps.length - 1) return previous + 1
        return previous
      })
    }, 6000)
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
      const url = `${API_URL}/predict`
      console.log('Submitting prediction request', { url, payload })
      const response = await axios.post(url, payload)
      navigate('/results', { state: { result: response.data, form } })
    } catch (requestError) {
      const response = requestError.response
      console.error('Prediction request failed', {
        url: response?.config?.url || 'https://oralguard-api.onrender.com/predict',
        status: response?.status,
        statusText: response?.statusText,
        responseBody: response?.data,
        errorMessage: requestError.message,
      })
      setError(requestError.code === 'ERR_NETWORK'
        ? 'Server is waking up after inactivity — please wait 30 seconds and try again.'
        : `Error: ${response?.data?.detail || requestError.message}`)
    } finally {
      setLoading(false)
      clearInterval(stepInterval)
      setLoadingStep(0)
    }
  }

  const stepFields = [
    ['age_group', 'gender', 'occupation', 'location'],
    ['smoking', 'vaping', 'alcohol', 'gutka_paan', 'passive_smoking', 'brushing_freq', 'oral_hygiene_score', 'dental_visits', 'flossing', 'mouthwash'],
    ['mouth_ulcers', 'white_patches', 'mouth_pain', 'difficulty_swallowing', 'swelling_lumps', 'voice_change', 'stress_level', 'sleep_hours', 'processed_food', 'sugary_drinks', 'fruit_veg_intake', 'family_history', 'diabetes'],
  ]
  const answeredCount = stepFields[step - 1].filter(field => String(form[field]).trim() !== '').length
  const requiredAnswered = ['age_group', 'gender', 'occupation', 'location'].filter(field => String(form[field]).trim() !== '').length
  const canContinue = step !== 1 || requiredAnswered === 4
  const transition = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, x: direction * 25 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: direction * -25 }, transition: { duration: .22, ease: 'easeOut' } }

  const selectable = (field, options) => (
    <div className="option-grid">
      {options.map(option => <OptionCard key={option.value} {...option} form={form} field={field} update={update} />)}
    </div>
  )

  return (
    <div className="page-shell assessment-page">
      <header className="site-nav">
        <div className="container nav-inner">
          <button type="button" className="brand" onClick={() => navigate('/')} aria-label="OralGuard home">
            <span className="brand-mark"><ShieldCheck size={18} /></span><span>OralGuard</span>
          </button>
          <span className="chip"><ShieldCheck size={13} /> Private assessment</span>
        </div>
      </header>

      <main className="container assessment-top">
        <p className="eyebrow"><Sparkles size={14} /> Your guided assessment</p>
        <h1>Small steps toward <span className="gradient-text">more awareness.</span></h1>
        <p>Your answers stay in this session and help create your personalized report.</p>

        <div className="stepper" aria-label={`Step ${step} of 3`}>
          <div className="stepper-track"><div className="stepper-progress" style={{ width: `${((step - 1) / 2) * 100}%` }} /></div>
          {stepTitles.map((title, index) => {
            const number = index + 1
            return (
              <div className={`stepper-item${number === step ? ' active' : ''}${number < step ? ' complete' : ''}`} key={title}>
                <span className="stepper-node">{number < step ? <Check size={15} /> : number}</span>
                <span>{title}</span>
              </div>
            )
          })}
        </div>

        <div className="assessment-meta">
          <span>Step {step} of 3</span>
          <span>{answeredCount} of {stepFields[step - 1].length} answered</span>
        </div>
        <div className="assessment-progress" aria-label="Assessment progress"><span style={{ width: `${(step / 3) * 100}%` }} /></div>

        <div className="assessment-scroll" ref={assessmentScrollRef}>
          <AnimatePresence mode="sync" initial={false}>
            <motion.section className="assessment-card glass-card" key={step} {...transition}>
              <h2 tabIndex={-1} ref={stepHeadingRef}>{stepTitles[step - 1]}</h2>
              <p>{stepDescriptions[step - 1]}</p>

              {step === 1 && (
                <>
                  <FieldSection icon={UserRound} title="About you">
                    <Field label="Age group *">
                      {selectable('age_group', [
                        { value: '18-20', icon: '🎓', label: '18–20' },
                        { value: '21-23', icon: '🧑‍🎓', label: '21–23' },
                        { value: '24-27', icon: '🌱', label: '24–27' },
                      ])}
                      {!form.age_group && <p className="field-error">Please select your age group.</p>}
                    </Field>
                    <Field label="Gender *">
                      {selectable('gender', [
                        { value: 'Male', icon: '👨', label: 'Male' },
                        { value: 'Female', icon: '👩', label: 'Female' },
                        { value: 'Other', icon: '🧑', label: 'Other' },
                      ])}
                      {!form.gender && <p className="field-error">Please select your gender.</p>}
                    </Field>
                    <Field label="Occupation *">
                      <input className="form-input" type="text" placeholder="e.g. Student, working professional..." value={form.occupation} onChange={event => update('occupation', event.target.value)} aria-invalid={!form.occupation.trim()} />
                      {!form.occupation.trim() && <p className="field-error">Please enter your occupation.</p>}
                    </Field>
                    <Field label="City *">
                      <input className="form-input" type="text" placeholder="Type to search your city..." value={form.location} onChange={event => update('location', event.target.value)} list="cities-list" aria-invalid={!form.location.trim()} />
                      <datalist id="cities-list">{cities.map((city, index) => <option key={index} value={city} />)}</datalist>
                      {!form.location.trim() && <p className="field-error">Please enter your city.</p>}
                      {cities.length === 0 && <p className="field-hint">Loading city suggestions…</p>}
                    </Field>
                  </FieldSection>
                </>
              )}

              {step === 2 && (
                <>
                  <FieldSection icon={HeartPulse} title="Substance use">
                    <Field label="Smoking">
                      {selectable('smoking', [
                        { value: '0', icon: '🌿', label: 'Never' },
                        { value: '1', icon: '🚬', label: 'Occasionally', danger: true },
                        { value: '2', icon: '⚠️', label: 'Regularly', danger: true },
                      ])}
                    </Field>
                    <Field label="Vaping / e-cigarettes">
                      {selectable('vaping', [
                        { value: '0', icon: '🌬️', label: 'Never' },
                        { value: '1', icon: '💨', label: 'Occasionally', danger: true },
                        { value: '2', icon: '⚠️', label: 'Regularly', danger: true },
                      ])}
                    </Field>
                    <Field label="Alcohol">
                      {selectable('alcohol', [
                        { value: '0', icon: '💧', label: 'Never' },
                        { value: '1', icon: '🥂', label: 'Social', danger: true },
                        { value: '2', icon: '⚠️', label: 'Regularly', danger: true },
                      ])}
                    </Field>
                    <Field label="Gutka / paan / betel nut"><YesNo field="gutka_paan" form={form} update={update} noLabel="Never" yesLabel="Sometimes" /></Field>
                    <Field label="Passive smoking"><YesNo field="passive_smoking" form={form} update={update} noLabel="Not exposed" yesLabel="Exposed" /></Field>
                  </FieldSection>

                  <FieldSection icon={ShieldCheck} title="Oral hygiene">
                    <SliderField label="Brushing frequency" field="brushing_freq" min={0} max={2} form={form} update={update} format={value => value === '0' ? 'Rarely' : value === '1' ? '1× daily' : '2× daily'} emoji={value => value === 0 ? '🪥' : value === 1 ? '😁' : '✨'} />
                    <SliderField label="Oral hygiene rating" field="oral_hygiene_score" min={1} max={5} form={form} update={update} format={value => `${value} / 5`} emoji={value => value < 3 ? '😐' : value < 5 ? '🙂' : '✨'} />
                    <Field label="Dental visits">
                      <select className="form-select" value={form.dental_visits} onChange={event => update('dental_visits', event.target.value)}>
                        <option value="never">Never</option>
                        <option value="problem_only">Only when there is a problem</option>
                        <option value="yearly">Once a year</option>
                        <option value="sixmonthly">Every 6 months</option>
                      </select>
                    </Field>
                    <Field label="Do you floss?"><YesNo field="flossing" form={form} update={update} /></Field>
                    <Field label="Do you use mouthwash?"><YesNo field="mouthwash" form={form} update={update} /></Field>
                  </FieldSection>
                </>
              )}

              {step === 3 && (
                <>
                  <FieldSection icon={Activity} title="Symptoms lately">
                    <Field label="Mouth ulcers (past 6 months)">
                      {selectable('mouth_ulcers', [
                        { value: '0', icon: '🌱', label: 'None' },
                        { value: '1', icon: '😬', label: 'Occasionally', danger: true },
                        { value: '2', icon: '⚠️', label: 'Frequently', danger: true },
                      ])}
                    </Field>
                    <Field label="White / red patches in mouth">
                      {selectable('white_patches', [
                        { value: '0', icon: '🌱', label: 'None' },
                        { value: '1', icon: '🤔', label: 'Not sure', danger: true },
                        { value: '2', icon: '⚠️', label: 'Yes', danger: true },
                      ])}
                    </Field>
                    <Field label="Mouth pain / soreness">
                      {selectable('mouth_pain', [
                        { value: '0', icon: '🙂', label: 'None' },
                        { value: '1', icon: '😣', label: 'Mild', danger: true },
                        { value: '2', icon: '⚠️', label: 'Severe', danger: true },
                      ])}
                    </Field>
                    <Field label="Difficulty swallowing">
                      {selectable('difficulty_swallowing', [
                        { value: '0', icon: '🌱', label: 'None' },
                        { value: '1', icon: '😟', label: 'Sometimes', danger: true },
                        { value: '2', icon: '⚠️', label: 'Often', danger: true },
                      ])}
                    </Field>
                    <Field label="Swelling / lumps in mouth or neck">
                      {selectable('swelling_lumps', [
                        { value: '0', icon: '🌱', label: 'None' },
                        { value: '1', icon: '🤔', label: 'Not sure', danger: true },
                        { value: '2', icon: '⚠️', label: 'Yes', danger: true },
                      ])}
                    </Field>
                    <Field label="Voice changes / hoarseness">
                      {selectable('voice_change', [
                        { value: '0', icon: '🗣️', label: 'None' },
                        { value: '1', icon: '🤔', label: 'Sometimes', danger: true },
                        { value: '2', icon: '⚠️', label: 'Often', danger: true },
                      ])}
                    </Field>
                  </FieldSection>

                  <FieldSection icon={Sparkles} title="Lifestyle">
                    <SliderField label="Stress level" field="stress_level" min={1} max={10} form={form} update={update} format={value => `${value} / 10`} emoji={value => value < 4 ? '😌' : value < 7 ? '😐' : '😮‍💨'} />
                    <SliderField label="Average sleep" field="sleep_hours" min={4} max={9} step={0.5} form={form} update={update} format={value => `${value}h`} emoji={value => value < 6 ? '🥱' : value < 8 ? '🙂' : '😴'} />
                  </FieldSection>

                  <FieldSection icon={HeartPulse} title="Diet">
                    {[
                      { field: 'processed_food', label: 'Processed / junk food', highDanger: true },
                      { field: 'sugary_drinks', label: 'Sugary drinks', highDanger: true },
                      { field: 'fruit_veg_intake', label: 'Fruit & vegetable intake', highDanger: false },
                    ].map(({ field, label, highDanger }) => (
                      <Field key={field} label={label}>
                        {selectable(field, [
                          { value: 'low', icon: '🟢', label: 'Low' },
                          { value: 'medium', icon: '🟡', label: 'Medium' },
                          { value: 'high', icon: '🔴', label: 'High', danger: highDanger },
                        ])}
                      </Field>
                    ))}
                  </FieldSection>

                  <FieldSection icon={Stethoscope} title="Medical history">
                    <Field label="Family history of cancer"><YesNo field="family_history" form={form} update={update} /></Field>
                    <Field label="Diagnosed with diabetes"><YesNo field="diabetes" form={form} update={update} /></Field>
                  </FieldSection>
                </>
              )}

              {error && <div className="form-error" role="alert"><TriangleAlert size={16} />{error}</div>}
            </motion.section>
          </AnimatePresence>
        </div>
      </main>

      <div className="assessment-action-wrap">
        <div className="container assessment-actions">
          <button className="btn-ghost" onClick={handleBack} disabled={step === 1} type="button"><ArrowLeft size={16} /> Back</button>
          {step < 3
            ? <button className="btn-primary" onClick={handleNext} disabled={!canContinue} type="button">Next step <ArrowRight size={16} /></button>
            : <button className="btn-primary" onClick={handleSubmit} disabled={loading} type="button"><Sparkles size={16} /> Get My Report</button>}
        </div>
        {step === 1 && !canContinue && <p className="field-hint" style={{ textAlign: 'center', marginBottom: 0 }}>Complete the required fields above to continue.</p>}
      </div>

      {loading && (
        <div className="loading-backdrop" role="dialog" aria-modal="true" aria-labelledby="loading-title">
          <motion.div className="loading-modal glass-card" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduceMotion ? 0 : .2 }}>
            <div className="loading-tooth" aria-hidden="true"><span>🦷</span></div>
            <h2 id="loading-title">{loadingSteps[loadingStep]?.text}</h2>
            <p>{loadingSteps[loadingStep]?.subtext}</p>
            <div className="loading-track"><span style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }} /></div>
            <div className="loading-counter">Step {loadingStep + 1} of {loadingSteps.length} · {Math.round(((loadingStep + 1) / loadingSteps.length) * 100)}% complete</div>
            <div className="loading-checklist">
              {loadingSteps.map((item, index) => (
                <div className={`loading-check${index < loadingStep ? ' done' : ''}${index === loadingStep ? ' active' : ''}`} key={item.text}>
                  {index < loadingStep ? <CheckCircle2 size={13} /> : index === loadingStep ? <Sparkles size={13} /> : <Circle size={13} />}
                  <span>{item.text.replace('...', '')}</span>
                </div>
              ))}
            </div>
            <div className="loading-tip"><Info size={13} /> <strong>Did you know?</strong> Oral cancer is far more treatable when caught early.</div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
