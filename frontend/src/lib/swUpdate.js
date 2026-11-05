// Service-worker update flow: detect a waiting worker, let the UI offer a
// reload, then activate it and reload the page exactly once.
const subscribers = new Set()
let reloadRequested = false

export function initServiceWorkerUpdates(registration) {
  if (!registration) return

  if (registration.waiting) notify(registration.waiting)

  registration.addEventListener('updatefound', () => {
    const installing = registration.installing
    if (!installing) return
    installing.addEventListener('statechange', () => {
      // No controller means a first install — there is nothing to update.
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        notify(installing)
      }
    })
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloadRequested) return
    reloadRequested = true
    window.location.reload()
  })
}

export function subscribeServiceWorkerUpdates(fn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

export function applyServiceWorkerUpdate(worker) {
  if (!worker) return
  reloadRequested = true
  worker.postMessage({ type: 'SKIP_WAITING' })
}

function notify(worker) {
  subscribers.forEach((fn) => fn(worker))
}
