import { useEffect } from 'react'
import { toast } from './ui'
import { subscribeServiceWorkerUpdates, applyServiceWorkerUpdate } from '../lib/swUpdate'

// Offers a reload when a new service worker is waiting. The prompt is a toast
// with an action, so it never blocks the page.
export default function ServiceWorkerUpdate() {
  useEffect(() => subscribeServiceWorkerUpdates((worker) => {
    toast('A new version of Sampada is available', {
      duration: 60000,
      action: { label: 'Reload', onClick: () => applyServiceWorkerUpdate(worker) },
    })
  }), [])

  return null
}
