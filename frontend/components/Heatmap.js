import { slotKey } from '../lib/grid'

export default function Heatmap({ days, hours, slots, total, picked, onPick }) {
  if (!days.length || !hours.length) return null

  const cell = (key) => {
    const c = slots[key] || { yeah: 0, maybe: 0, nah: 0 }
    const score = c.yeah * 2 + c.maybe
    const max = Math.max(total * 2, 1)
    const ratio = score / max
    const alpha = score === 0 ? 0 : 0.16 + ratio * 0.8
    return {
      counts: c,
      style: {
        background:
          alpha === 0 ? '#fff' : `rgba(108, 77, 230, ${alpha.toFixed(2)})`,
        color: ratio > 0.55 ? '#fff' : 'var(--ink-soft)',
      },
    }
  }

  return (
    <div>
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
                  const { counts, style } = cell(key)
                  return (
                    <td key={key}>
                      <div
                        className={
                          'cell heat readonly' +
                          (picked === key ? ' picked' : '')
                        }
                        style={style}
                        onClick={() => onPick && onPick(key)}
                        title={`${counts.yeah} yeah · ${counts.maybe} maybe · ${counts.nah} nah`}
                      >
                        {counts.yeah > 0 ? counts.yeah : ''}
                      </div>
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
          <span className="swatch" style={{ background: 'rgba(108,77,230,0.16)' }} />
          fewer free
        </span>
        <span className="legend-item">
          <span className="swatch" style={{ background: 'rgba(108,77,230,0.96)' }} />
          most free
        </span>
        <span className="legend-item faint">number = how many said yeah</span>
      </div>
    </div>
  )
}
