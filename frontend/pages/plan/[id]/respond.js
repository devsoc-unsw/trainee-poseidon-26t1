import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../../components/Layout'
import AvailabilityGrid from '../../../components/AvailabilityGrid'
import { api } from '../../../lib/api'

function planMeta(plan) {
  if (!plan || !plan.days.length) return ''
  const first = plan.days[0]
  const last = plan.days[plan.days.length - 1]
  return first.date === last.date
    ? first.sub
    : `${first.sub} – ${last.sub}`
}

export default function Respond() {
  const router = useRouter()
  const { id } = router.query

  const [plan, setPlan] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [stage, setStage] = useState('intro') // intro | grid | done
  const [name, setName] = useState('')
  const [availability, setAvailability] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (!id) return
    api
      .getPlan(id)
      .then(setPlan)
      .catch((e) => setLoadError(e.message))
  }, [id])

  if (loadError) {
    return (
      <Layout title="plan not found">
        <div className="container-narrow">
          <div className="card card-pad" style={{ textAlign: 'center' }}>
            <h2 className="section-title">This plan doesn&apos;t exist</h2>
            <p className="muted" style={{ margin: '10px 0 20px' }}>
              The link might be broken or the plan was removed.
            </p>
            <Link href="/" className="btn btn-primary">
              back home
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  if (!plan) {
    return (
      <Layout title="loading">
        <div className="loading-wrap">loading plan…</div>
      </Layout>
    )
  }

  const goGrid = () => {
    setError('')
    if (!name.trim()) return setError('Pop your name in so the crew knows who you are.')
    setStage('grid')
  }

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      const updated = await api.respond(id, { name: name.trim(), availability })
      setPlan(updated)
      setStage('done')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const respondedCount = plan.responses.length

  return (
    <Layout title={plan.name} hideCta>
      <div className="container-narrow">
        <div className="plan-banner" style={{ marginBottom: 22 }}>
          <span className="type-tag">{plan.type}</span>
          <h1>{plan.name}</h1>
          <div className="banner-meta">
            {plan.organiser} is planning · {planMeta(plan)}
          </div>
        </div>

        {error && (
          <div className="notice notice-error" style={{ marginBottom: 18 }}>
            {error}
          </div>
        )}

        {/* ---------- intro ---------- */}
        {stage === 'intro' && (
          <div className="card card-pad">
            <h2 className="section-title" style={{ marginBottom: 6 }}>
              when are you free?
            </h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              {respondedCount} {respondedCount === 1 ? 'person has' : 'people have'}{' '}
              already responded. Add your times — it takes 20 seconds, no
              account needed.
            </p>
            <div className="field">
              <label className="field-label">your name</label>
              <input
                className="input"
                placeholder="e.g. Marcus Kim"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && goGrid()}
              />
            </div>
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={goGrid}
            >
              mark my availability
            </button>
          </div>
        )}

        {/* ---------- grid ---------- */}
        {stage === 'grid' && (
          <div className="card card-pad">
            <h2 className="section-title" style={{ marginBottom: 6 }}>
              mark your times, {name.trim().split(/\s+/)[0]}
            </h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              Pick a brush, then tap or drag across the grid.
            </p>
            <AvailabilityGrid
              days={plan.days}
              hours={plan.hours}
              value={availability}
              onChange={setAvailability}
            />
            <div className="row-between" style={{ marginTop: 26 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setStage('intro')}
              >
                back
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={submit}
                disabled={busy}
              >
                {busy ? 'submitting…' : 'submit availability'}
              </button>
            </div>
          </div>
        )}

        {/* ---------- done ---------- */}
        {stage === 'done' && (
          <div className="card card-pad center-card" style={{ marginTop: 0 }}>
            <div className="success-ring">
              <div />
            </div>
            <h2 className="section-title">you&apos;re in</h2>
            <p className="muted" style={{ margin: '10px 0 22px' }}>
              {plan.organiser} will let everyone know once the time is locked
              in.
            </p>
            <div className="field" style={{ textAlign: 'left' }}>
              <label className="field-label">
                get notified when it&apos;s set{' '}
                <span className="field-hint">— optional</span>
              </label>
              <input
                className="input"
                placeholder="+61 400 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Link
              href={`/plan/${id}/results`}
              className="btn btn-primary btn-block btn-lg"
            >
              see the live results
            </Link>
            <p className="faint" style={{ marginTop: 14, fontSize: 13 }}>
              waiting on{' '}
              {Math.max(plan.invited.length - respondedCount, 0)} more{' '}
              {plan.invited.length - respondedCount === 1 ? 'person' : 'people'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}
