// Mirrors the backend slot logic so the create flow can render the
// availability grid before the plan is persisted.

const TIME_HOURS = {
  morning: [9, 11],
  afternoon: [13, 15],
  evening: [17, 19],
  night: [21, 23],
}
const TIME_ORDER = ['morning', 'afternoon', 'evening', 'night']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseDate(str) {
  const [y, m, d] = (str || '').split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function fmt(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function hourLabel(h) {
  const suffix = h < 12 ? 'am' : 'pm'
  const hh = h % 12 || 12
  return `${hh}${suffix}`
}

export function buildDays(start, end) {
  let s = parseDate(start)
  let e = parseDate(end)
  if (!s) return []
  if (!e || e < s) e = s
  const days = []
  const d = new Date(s)
  while (d <= e && days.length < 14) {
    days.push({
      date: fmt(d),
      label: WEEKDAYS[d.getDay()],
      sub: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
    })
    d.setDate(d.getDate() + 1)
  }
  return days
}

export function buildHours(timeOfDay) {
  const hours = []
  for (const seg of TIME_ORDER) {
    if ((timeOfDay || []).includes(seg)) {
      for (const h of TIME_HOURS[seg]) {
        hours.push({ hour: h, label: hourLabel(h), seg })
      }
    }
  }
  return hours
}

export function slotKey(date, hour) {
  return `${date}@${hour}`
}
