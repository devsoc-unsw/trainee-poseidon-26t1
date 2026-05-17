import { useState, useRef, useEffect } from 'react'
import { slotKey } from '../lib/grid'

const BRUSHES = [
  { id: 'yeah', label: 'yeah' },
  { id: 'maybe', label: 'maybe' },
  { id: 'nah', label: 'nah' },
]

export default function AvailabilityGrid({ days, hours, value, onChange }) {
  const [brush, setBrush] = useState('yeah')
  const painting = useRef(null)

  useEffect(() => {
    const stop = () => {
      painting.current = null
    }
    window.addEventListener('mouseup', stop)
    return () => window.removeEventListener('mouseup', stop)
  }, [])

  if (!days.length || !hours.length) {
    return (
      <div className="empty">
        Pick your dates and time of day first — the grid shows up here.
      </div>
    )
  }

  const apply = (key, action) => {
    const next = { ...value }
    if (action === 'clear') delete next[key]
    else next[key] = action
    onChange(next)
  }

  const onDown = (key) => {
    const action = value[key] === brush ? 'clear' : brush
    painting.current = action
    apply(key, action)
  }

  const onEnter = (key) => {
    if (painting.current) apply(key, painting.current)
  }

  return (
    <div>
      <div className="grid-toolbar">
        <span className="field-hint">tap a cell · drag to paint a range</span>
        <div className="brush" style={{ marginLeft: 'auto' }}>
          {BRUSHES.map((b) => (
            <button
              key={b.id}
              data-state={b.id}
              className={brush === b.id ? 'on' : ''}
              onClick={() => setBrush(b.id)}
              type="button"
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-scroll">
        <table className="av-grid">
          <thead>
            <tr>
              <th />
              {days.map((d) => (
                <th key={d.date}>
                  {d.label}
                  <span className="th-sub">{d.sub}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h.hour}>
                <td className="row-label">{h.label}</td>
                {days.map((d) => {
                  const key = slotKey(d.date, h.hour)
                  return (
                    <td key={key}>
                      <div
                        className="cell"
                        data-state={value[key] || ''}
                        onMouseDown={() => onDown(key)}
                        onMouseEnter={() => onEnter(key)}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend">
        <span className="legend-item">
          <span className="swatch" style={{ background: 'var(--green-soft)', borderColor: 'var(--green)' }} />
          yeah — good for me
        </span>
        <span className="legend-item">
          <span className="swatch" style={{ background: 'var(--amber-soft)', borderColor: 'var(--amber)' }} />
          maybe — could work
        </span>
        <span className="legend-item">
          <span className="swatch" style={{ background: 'var(--nah-soft)' }} />
          nah — not great
        </span>
      </div>
    </div>
  )
}
