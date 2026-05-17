async function req(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  let data = {}
  try {
    data = await res.json()
  } catch {
    data = {}
  }
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong')
  }
  return data
}

export const api = {
  stats: () => req('/api/stats'),
  createPlan: (body) =>
    req('/api/plans', { method: 'POST', body: JSON.stringify(body) }),
  getPlan: (id) => req(`/api/plans/${id}`),
  respond: (id, body) =>
    req(`/api/plans/${id}/responses`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  invite: (id, name) =>
    req(`/api/plans/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  nudge: (id) => req(`/api/plans/${id}/nudge`, { method: 'POST' }),
  lock: (id, body) =>
    req(`/api/plans/${id}/lock`, { method: 'POST', body: JSON.stringify(body) }),
  unlock: (id) => req(`/api/plans/${id}/unlock`, { method: 'POST' }),
  headcount: (id, name, status) =>
    req(`/api/plans/${id}/headcount`, {
      method: 'POST',
      body: JSON.stringify({ name, status }),
    }),
  addItem: (id, item, by) =>
    req(`/api/plans/${id}/items`, {
      method: 'POST',
      body: JSON.stringify({ item, by }),
    }),
  delItem: (id, itemId) =>
    req(`/api/plans/${id}/items/${itemId}`, { method: 'DELETE' }),
}
