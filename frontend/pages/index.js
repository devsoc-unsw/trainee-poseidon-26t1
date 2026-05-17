import { useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { api } from '../lib/api'

const FEATURES = [
  {
    icon: 'f',
    title: 'no sign-up, ever',
    body: 'Friends tap the link and mark their times. No account, no app download, no excuses.',
  },
  {
    icon: '~',
    title: 'soft availability',
    body: 'yeah, maybe, or nah. Real life is messier than free-or-busy, so freeup captures the nuance.',
  },
  {
    icon: 'R',
    title: 'recurring plans',
    body: 'Best night for the weekly gym sesh or game night, found fresh every week.',
  },
  {
    icon: '!',
    title: 'nudge the slackers',
    body: 'One tap sends a reminder that reads like it came from you — not a robot.',
  },
]

const STEPS = [
  {
    title: 'create a plan',
    body: 'Name it, pick a vibe, set a date window and drop in your own availability.',
  },
  {
    title: 'share the link',
    body: 'Paste it in the group chat. Everyone marks yeah / maybe / nah in 20 seconds.',
  },
  {
    title: 'lock it in',
    body: 'freeup surfaces the best window instantly. Confirm it, add a spot, done.',
  },
]

export default function Home() {
  const [plansMade, setPlansMade] = useState(null)

  useEffect(() => {
    api
      .stats()
      .then((d) => setPlansMade(d.plansMade))
      .catch(() => setPlansMade(0))
  }, [])

  return (
    <Layout>
      <section className="container">
        <div className="hero">
          <span className="eyebrow">no sign-up · just a link</span>
          <h1>
            your plans keep <span className="accent">dying</span>.
            <br />
            freeup keeps them alive.
          </h1>
          <p className="hero-sub">
            Making plans with friends shouldn&apos;t take three group chats and a
            spreadsheet. Share a link, your crew marks when they&apos;re free, and
            you get the answer — instantly.
          </p>
          <div className="hero-cta">
            <Link href="/create" className="btn btn-primary btn-lg">
              create a plan
            </Link>
            <Link href="#how" className="btn btn-ghost btn-lg">
              how it works
            </Link>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat">
            <div className="stat-num">{plansMade ?? '—'}</div>
            <div className="stat-label">plans made on freeup</div>
          </div>
          <div className="stat">
            <div className="stat-num">94%</div>
            <div className="stat-label">actually happened</div>
          </div>
          <div className="stat">
            <div className="stat-num">0</div>
            <div className="stat-label">sign-ups required</div>
          </div>
        </div>
      </section>

      <section className="container" id="features" style={{ marginTop: 72 }}>
        <span className="eyebrow">why freeup</span>
        <h2 className="section-title" style={{ marginTop: 10 }}>
          Built for friend groups, not boardrooms.
        </h2>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container" id="how" style={{ marginTop: 72 }}>
        <span className="eyebrow">how it works</span>
        <h2 className="section-title" style={{ marginTop: 10 }}>
          Three steps. Twenty seconds each.
        </h2>
        <div className="steps-row">
          {STEPS.map((s, i) => (
            <div className="step-card" key={s.title}>
              <div className="step-num">{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container" style={{ marginTop: 72 }}>
        <div
          className="card card-pad"
          style={{ textAlign: 'center', background: 'var(--purple-tint)' }}
        >
          <h2 className="section-title">Got a plan dying in a group chat?</h2>
          <p className="muted" style={{ margin: '10px 0 22px' }}>
            Spin up a freeup link and revive it in under a minute.
          </p>
          <Link href="/create" className="btn btn-primary btn-lg">
            create a plan
          </Link>
        </div>
      </section>
    </Layout>
  )
}
