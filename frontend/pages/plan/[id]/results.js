import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../../components/Layout'
import Heatmap from '../../../components/Heatmap'
import { hourLabel } from '../../../lib/grid'
import { api } from '../../../lib/api'

function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function describeSlot(plan, key) {
  if (!key) return null
  const [date, hourStr] = key.split('@')
  const day = plan.days.find((d) => d.date === date)
  const hour = Number(hourStr)
  return {
    day: day ? `${day.label}, ${day.sub}` : date,
    time: hourLabel(hour),
    counts: plan.results.slots[key] || { yeah: 0, maybe: 0, nah: 0 },
  }
}

const HEADCOUNT = [
  { id: 'coming', label: 'coming', tag: 'tag-yeah' },
  { id: 'maybe', label: 'maybe', tag: 'tag-maybe' },
  { id: 'cant', label: "can't", tag: 'tag-nah' },
]

export default function Results() {
  const router = useRouter()
  const { id } = router.query

  const [plan, setPlan] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [picked, setPicked] = useState(null)
  const [pickTouched, setPickTouched] = useState(false)
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [nudged, setNudged] = useState(false)
  const [itemName, setItemName] = useState('')
  const [itemBy, setItemBy] = useState('')

  const load = useCallback(
    (silent) => {
      if (!id) return
      api
        .getPlan(id)
        .then((p) => {
          setPlan(p)
          if (!silent) {
            setLocation(p.location || '')
            setNotes(p.notes || '')
          }
        })
        .catch((e) => !silent && setLoadError(e.message))
    },
    [id]
  )

  useEffect(() => {
    load(false)
  }, [load])

  // light polling so results feel live
  useEffect(() => {
    if (!id) return
    const t = setInterval(() => load(true), 12000)
    return () => clearInterval(t)
  }, [id, load])

  if (loadError) {
    return (
      <Layout title="plan not found">
        <div className="container-narrow">
          <div className="card card-pad" style={{ textAlign: 'center' }}>
            <h2 className="section-title">This plan doesn&apos;t exist</h2>
            <p className="muted" style={{ margin: '10px 0 20px' }}>
              Double-check the link.
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
        <div className="loading-wrap">loading results…</div>
      </Layout>
    )
  }

  const { results } = plan
  const locked = !!plan.lockedSlot
  const activeKey =
    picked || plan.lockedSlot || (pickTouched ? null : results.best?.key) || null
  const slotInfo = describeSlot(plan, activeKey)
  const respByName = {}
  plan.responses.forEach((r) => {
    respByName[r.name.trim().toLowerCase()] = r
  })
  const waiting = plan.invited.filter((p) => !p.responded)

  const pick = (key) => {
    setPicked(key)
    setPickTouched(true)
  }

  const doNudge = async () => {
    try {
      const p = await api.nudge(id)
      setPlan(p)
      setNudged(true)
      setTimeout(() => setNudged(false), 2200)
    } catch (e) {
      setError(e.message)
    }
  }

  const doLock = async () => {
    setError('')
    if (!activeKey) return setError('Pick a time on the grid first.')
    setBusy(true)
    try {
      const p = await api.lock(id, { slot: activeKey, location, notes })
      setPlan(p)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const doUnlock = async () => {
    setBusy(true)
    try {
      const p = await api.unlock(id)
      setPlan(p)
      setPicked(p.results.best?.key || null)
      setPickTouched(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const setHeadcount = async (name, status) => {
    try {
      setPlan(await api.headcount(id, name, status))
    } catch (e) {
      setError(e.message)
    }
  }

  const addItem = async () => {
    if (!itemName.trim()) return
    try {
      setPlan(await api.addItem(id, itemName.trim(), itemBy.trim()))
      setItemName('')
      setItemBy('')
    } catch (e) {
      setError(e.message)
    }
  }

  const delItem = async (itemId) => {
    try {
      setPlan(await api.delItem(id, itemId))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Layout title={plan.name}>
      <div className="container">
        <div className="plan-banner" style={{ marginBottom: 22 }}>
          <span className="type-tag">{plan.type}</span>
          <h1>{plan.name}</h1>
          <div className="banner-meta">
            {plan.organiser} is planning · {results.total}{' '}
            {results.total === 1 ? 'response' : 'responses'} ·{' '}
            {plan.invited.length} invited
          </div>
        </div>

        {error && (
          <div className="notice notice-error" style={{ marginBottom: 18 }}>
            {error}
          </div>
        )}

        {locked && slotInfo && (
          <div
            className="best-callout"
            style={{ marginBottom: 22, textAlign: 'left' }}
          >
            <span className="best-eyebrow">locked in</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span className="best-time">{slotInfo.time}</span>
              <span className="best-day">{slotInfo.day}</span>
            </div>
            <div style={{ fontSize: 14.5, opacity: 0.92, marginTop: 4 }}>
              {plan.location ? `at ${plan.location}` : 'no spot set yet'}
              {plan.notes ? ` · ${plan.notes}` : ''}
            </div>
          </div>
        )}

        <div className="grid-2">
          {/* ---------------- main column ---------------- */}
          <div className="stack">
            {/* best time */}
            {!locked &&
              (results.best ? (
                <div className="best-callout">
                  <span className="best-eyebrow">best time right now</span>
                  <div className="best-time">
                    {describeSlot(plan, results.best.key).time}
                  </div>
                  <div className="best-day">
                    {describeSlot(plan, results.best.key).day}
                  </div>
                  <div className="best-stat-row">
                    <div className="best-stat">
                      <b>
                        {results.best.available}/{results.total}
                      </b>
                      <span>can make it</span>
                    </div>
                    <div className="best-stat">
                      <b>{results.best.yeah}</b>
                      <span>said yeah</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card card-pad" style={{ textAlign: 'center' }}>
                  <h2 className="section-title">No responses yet</h2>
                  <p className="muted" style={{ marginTop: 8 }}>
                    Share the link — the best time shows up here the moment
                    people reply.
                  </p>
                </div>
              ))}

            {/* heatmap */}
            <div className="card card-pad">
              <div className="row-between" style={{ marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800 }}>
                    live availability
                  </h3>
                  <p className="field-hint">
                    {locked
                      ? 'the locked slot is outlined'
                      : 'click a cell to pick a different time'}
                  </p>
                </div>
              </div>
              <Heatmap
                days={plan.days}
                hours={plan.hours}
                slots={results.slots}
                total={results.total}
                picked={activeKey}
                onPick={locked ? null : pick}
              />
            </div>

            {/* lock in */}
            {!locked && (
              <div className="card card-pad">
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>lock it in</h3>
                <p className="field-hint" style={{ marginBottom: 16 }}>
                  {slotInfo
                    ? `confirming ${slotInfo.day} at ${slotInfo.time}`
                    : 'pick a time on the grid above'}
                </p>
                <div className="field">
                  <label className="field-label">
                    spot <span className="field-hint">— optional</span>
                  </label>
                  <input
                    className="input"
                    placeholder="add a place or address"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 20 }}>
                  <label className="field-label">
                    notes for the group{' '}
                    <span className="field-hint">— optional</span>
                  </label>
                  <textarea
                    className="textarea"
                    placeholder="byo, meet at the station first, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary btn-block btn-lg"
                  onClick={doLock}
                  disabled={busy || !activeKey}
                >
                  {busy ? 'locking in…' : 'lock it in & notify everyone'}
                </button>
              </div>
            )}

            {/* post-plan: who's bringing what */}
            {locked && (
              <div className="card card-pad">
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                  who&apos;s bringing what
                </h3>
                <p className="field-hint" style={{ marginBottom: 16 }}>
                  Sort the supplies before the day.
                </p>
                <div className="input-row" style={{ marginBottom: 14 }}>
                  <input
                    className="input"
                    placeholder="item — e.g. drinks"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  />
                  <input
                    className="input"
                    placeholder="who"
                    style={{ maxWidth: 150 }}
                    value={itemBy}
                    onChange={(e) => setItemBy(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  />
                  <button className="btn btn-ghost" onClick={addItem}>
                    add
                  </button>
                </div>
                {plan.items.length ? (
                  <div className="stack" style={{ gap: 8 }}>
                    {plan.items.map((it) => (
                      <div className="item-row" key={it.id}>
                        <span className="item-name">{it.item}</span>
                        {it.by && <span className="item-by">{it.by}</span>}
                        <button
                          className="x-btn"
                          onClick={() => delItem(it.id)}
                          aria-label="remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty">
                    Nothing on the list yet — add the first thing.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------- side column ---------------- */}
          <div className="stack">
            {/* responders / nudge */}
            <div className="card card-pad">
              <div className="row-between" style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800 }}>the crew</h3>
                <span className="faint" style={{ fontSize: 13, fontWeight: 600 }}>
                  {results.total}/{plan.invited.length} in
                </span>
              </div>
              <div className="people">
                {plan.invited.map((p) => {
                  const r = respByName[p.name.trim().toLowerCase()]
                  return (
                    <div className="person" key={p.name}>
                      <span className="avatar">{initials(p.name)}</span>
                      <span className="person-name">{p.name}</span>
                      {!p.responded ? (
                        <span className="tag tag-wait">waiting</span>
                      ) : locked && r ? (
                        <span
                          className={
                            'tag ' +
                            (HEADCOUNT.find((h) => h.id === r.headcount)?.tag ||
                              'tag-wait')
                          }
                        >
                          {r.headcount === 'cant' ? "can't" : r.headcount}
                        </span>
                      ) : (
                        <span className="tag tag-yeah">responded</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {waiting.length > 0 && (
                <>
                  <div className="divider" />
                  <div className="notice notice-amber" style={{ marginBottom: 12 }}>
                    {waiting.length}{' '}
                    {waiting.length === 1 ? 'person hasn’t' : 'people haven’t'}{' '}
                    responded yet
                  </div>
                  <button className="btn btn-soft btn-block" onClick={doNudge}>
                    {nudged ? 'nudge sent!' : 'nudge the slackers'}
                  </button>
                  {plan.nudgeCount > 0 && (
                    <p
                      className="faint"
                      style={{ fontSize: 12.5, marginTop: 8, textAlign: 'center' }}
                    >
                      {plan.nudgeCount} nudge{plan.nudgeCount === 1 ? '' : 's'}{' '}
                      sent
                    </p>
                  )}
                </>
              )}
            </div>

            {/* headcount after lock */}
            {locked && (
              <div className="card card-pad">
                <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>
                  final headcount
                </h3>
                <p className="field-hint" style={{ marginBottom: 14 }}>
                  Tap a name to update who&apos;s in.
                </p>
                <div className="stack" style={{ gap: 12 }}>
                  {plan.responses.map((r) => (
                    <div key={r.name}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          marginBottom: 6,
                        }}
                      >
                        {r.name}
                      </div>
                      <div className="toggle-pills">
                        {HEADCOUNT.map((h) => (
                          <button
                            key={h.id}
                            className={r.headcount === h.id ? 'on' : ''}
                            onClick={() => setHeadcount(r.name, h.id)}
                          >
                            {h.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="divider" />
                <div className="row-between">
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    coming
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 850,
                      color: 'var(--green-ink)',
                    }}
                  >
                    {
                      plan.responses.filter((r) => r.headcount === 'coming')
                        .length
                    }
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-block"
                  style={{ marginTop: 16 }}
                  onClick={doUnlock}
                  disabled={busy}
                >
                  change the time
                </button>
              </div>
            )}

            {/* share reminder */}
            <div className="card card-pad">
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>
                still need replies?
              </h3>
              <p className="field-hint" style={{ marginBottom: 12 }}>
                Send the link again.
              </p>
              <Link
                href={`/plan/${id}/respond`}
                className="btn btn-ghost btn-block"
              >
                open the respond page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
