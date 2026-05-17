import { useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../components/Layout'
import AvailabilityGrid from '../components/AvailabilityGrid'
import { buildDays, buildHours } from '../lib/grid'
import { api } from '../lib/api'

const TYPES = [
  'pregame',
  'study',
  'gym',
  'dinner',
  'gaming',
  'concert',
  'beach',
  'other',
]
const TIMES = ['morning', 'afternoon', 'evening', 'night']
const STEPS = ['set up', 'your availability', 'share']

function isoDate(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function Stepper({ step }) {
  return (
    <div className="stepper">
      {STEPS.map((label, i) => (
        <div
          key={label}
          className={
            'stepper-item ' +
            (i === step ? 'active' : i < step ? 'done' : '')
          }
        >
          <span className="stepper-dot">{i < step ? '✓' : i + 1}</span>
          {label}
          {i < STEPS.length - 1 && <span className="stepper-bar" />}
        </div>
      ))}
    </div>
  )
}

export default function Create() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // step 1 fields
  const [organiser, setOrganiser] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('pregame')
  const [dateStart, setDateStart] = useState(isoDate(0))
  const [dateEnd, setDateEnd] = useState(isoDate(6))
  const [timeOfDay, setTimeOfDay] = useState(['evening'])

  // step 2
  const [availability, setAvailability] = useState({})

  // step 3
  const [plan, setPlan] = useState(null)
  const [inviteName, setInviteName] = useState('')
  const [copied, setCopied] = useState(false)

  const days = useMemo(() => buildDays(dateStart, dateEnd), [dateStart, dateEnd])
  const hours = useMemo(() => buildHours(timeOfDay), [timeOfDay])

  const shareUrl =
    plan && typeof window !== 'undefined'
      ? `${window.location.origin}/plan/${plan.id}/respond`
      : ''

  const toggleTime = (t) => {
    setTimeOfDay((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  const goStep2 = () => {
    setError('')
    if (!organiser.trim()) return setError('Add your name so your crew knows who is asking.')
    if (!name.trim()) return setError('Give your plan a name.')
    if (!days.length) return setError('Pick a valid date window.')
    if (!timeOfDay.length) return setError('Pick at least one time of day.')
    setStep(1)
  }

  const createPlan = async () => {
    setError('')
    setBusy(true)
    try {
      const created = await api.createPlan({
        name,
        type,
        dateStart,
        dateEnd,
        timeOfDay,
        organiser,
        availability,
      })
      setPlan(created)
      setStep(2)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const addInvite = async () => {
    if (!inviteName.trim()) return
    try {
      const updated = await api.invite(plan.id, inviteName.trim())
      setPlan(updated)
      setInviteName('')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Layout title="create a plan">
      <div className="container-narrow">
        <Stepper step={step} />

        {error && (
          <div className="notice notice-error" style={{ marginBottom: 18 }}>
            {error}
          </div>
        )}

        {/* ---------------- STEP 1 ---------------- */}
        {step === 0 && (
          <div className="card card-pad">
            <span className="eyebrow">step 1 of 3</span>
            <h2 className="section-title" style={{ margin: '8px 0 4px' }}>
              set up your plan
            </h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              Takes 30 seconds. No account needed.
            </p>

            <div className="field">
              <label className="field-label">your name</label>
              <input
                className="input"
                placeholder="e.g. Jess Liu"
                value={organiser}
                onChange={(e) => setOrganiser(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label">what are you planning?</label>
              <input
                className="input"
                placeholder="e.g. friday night pregame"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label">type of plan</label>
              <div className="chip-grid">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={'chip ' + (type === t ? 'on' : '')}
                    onClick={() => setType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="field-label">
                date window{' '}
                <span className="field-hint">— up to 14 days</span>
              </label>
              <div className="input-row">
                <input
                  type="date"
                  className="input"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
                <input
                  type="date"
                  className="input"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 28 }}>
              <label className="field-label">time of day</label>
              <div className="chip-grid">
                {TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={'chip ' + (timeOfDay.includes(t) ? 'on' : '')}
                    onClick={() => toggleTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary btn-block btn-lg" onClick={goStep2}>
              next — your availability
            </button>
          </div>
        )}

        {/* ---------------- STEP 2 ---------------- */}
        {step === 1 && (
          <div className="card card-pad">
            <span className="eyebrow">step 2 of 3</span>
            <h2 className="section-title" style={{ margin: '8px 0 4px' }}>
              when are you free?
            </h2>
            <p className="muted" style={{ marginBottom: 22 }}>
              Mark your own times for <strong>{name}</strong> — your crew sees
              this as a head start.
            </p>

            <AvailabilityGrid
              days={days}
              hours={hours}
              value={availability}
              onChange={setAvailability}
            />

            <div className="row-between" style={{ marginTop: 26 }}>
              <button className="btn btn-ghost" onClick={() => setStep(0)}>
                back
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={createPlan}
                disabled={busy}
              >
                {busy ? 'creating…' : 'create share link'}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- STEP 3 ---------------- */}
        {step === 2 && plan && (
          <div className="card card-pad">
            <span className="eyebrow">step 3 of 3</span>
            <h2 className="section-title" style={{ margin: '8px 0 4px' }}>
              share with your crew
            </h2>
            <p className="muted" style={{ marginBottom: 22 }}>
              Drop this link in the group chat. No account needed — it works
              anywhere.
            </p>

            <div className="field">
              <label className="field-label">your link</label>
              <div className="link-box">
                <code>{shareUrl}</code>
                <button className="btn btn-soft" onClick={copyLink}>
                  {copied ? 'copied!' : 'copy'}
                </button>
              </div>
              <div className="share-targets">
                <a
                  className="share-target"
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `mark when you're free for ${name}: ${shareUrl}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  whatsapp
                </a>
                <button className="share-target" onClick={copyLink}>
                  discord
                </button>
                <a
                  className="share-target"
                  href={`sms:?&body=${encodeURIComponent(
                    `mark when you're free for ${name}: ${shareUrl}`
                  )}`}
                >
                  message
                </a>
                <a
                  className="share-target"
                  href={`mailto:?subject=${encodeURIComponent(
                    name
                  )}&body=${encodeURIComponent(shareUrl)}`}
                >
                  email
                </a>
              </div>
            </div>

            <div className="divider" />

            <div className="field">
              <label className="field-label">
                who&apos;s invited{' '}
                <span className="field-hint">
                  — track who&apos;s replied
                </span>
              </label>
              <div className="input-row" style={{ marginBottom: 12 }}>
                <input
                  className="input"
                  placeholder="add a friend's name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addInvite()}
                />
                <button className="btn btn-ghost" onClick={addInvite}>
                  add
                </button>
              </div>
              <div className="people">
                {plan.invited.map((p) => (
                  <div className="person" key={p.name}>
                    <span className="avatar">{initials(p.name)}</span>
                    <span className="person-name">{p.name}</span>
                    <span
                      className={'tag ' + (p.responded ? 'tag-yeah' : 'tag-wait')}
                    >
                      {p.responded ? 'responded' : 'waiting'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={() => router.push(`/plan/${plan.id}/results`)}
            >
              go to live results
            </button>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <Link
                href={`/plan/${plan.id}/respond`}
                className="muted"
                style={{ fontSize: 13.5, fontWeight: 600 }}
              >
                preview the respond page →
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
