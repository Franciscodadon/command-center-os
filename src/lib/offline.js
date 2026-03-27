// Offline-first local storage helper, namespaced per user
let _userId = null

export function setUserId(id) { _userId = id }

function key(name) {
  return `ccOS:${_userId || 'anon'}:${name}`
}

export function localGet(name) {
  try {
    const raw = localStorage.getItem(key(name))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function localSet(name, data) {
  try {
    localStorage.setItem(key(name), JSON.stringify(data))
  } catch {}
}

export function localMerge(name, updates) {
  const existing = localGet(name) || {}
  localSet(name, { ...existing, ...updates })
}
