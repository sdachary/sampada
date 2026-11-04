// IndexedDB-backed queue for mutations made while offline. api.request() enqueues
// network-failed mutating calls here; on reconnect drain() replays them oldest-first
// with an Idempotency-Key header and removes each entry the server has decided.
const DB_NAME = 'sampada-offline'
const STORE = 'queue'
const QUEUE_EVENT = 'sampada:queue'

let dbPromise = null

function open() {
  dbPromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function dispatch() {
  const db = await open()
  const count = await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: { pending: count } }))
  return count
}

export async function enqueue(method, path, body) {
  const db = await open()
  const entry = { method, path, body, key: crypto.randomUUID(), tries: 0, queuedAt: Date.now() }
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add(entry)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  dispatch()
  return entry
}

async function removeEntry(db, id) {
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

// GETs are never queued, so every entry is a JSON mutation.
export async function drain() {
  const db = await open()
  const entries = await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
  entries.sort((a, b) => a.id - b.id)
  for (const entry of entries) {
    try {
      const res = await fetch(entry.path, {
        method: entry.method,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': entry.key,
        },
        body: entry.body,
        credentials: 'include',
      })
      // Success, or the server already decided (invalid/legacy/conflict) — drop it.
      // 401/409/429 and 5xx stay queued: 401 may clear after re-auth, 5xx may recover.
      const decided = res.ok || (res.status >= 400 && res.status < 500 &&
        res.status !== 401 && res.status !== 409 && res.status !== 429)
      if (decided) await removeEntry(db, entry.id)
    } catch {
      break // offline again — leave the rest queued for the next drain
    }
  }
  dispatch()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', drain)
}

// ponytail: retry cap/backoff deliberately absent — replays only on `online`; add both if 5xx churning shows up
