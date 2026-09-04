const VAPID_PUBLIC_KEY = null;

async function getVapidKey() {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;
  const res = await fetch('/api/v1/push_subscriptions/vapid_public_key', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  const data = await res.json();
  return data.data?.public_key;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.register('/sw.js');
  return reg;
}

export async function subscribeToPush(registration) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const publicKey = await getVapidKey();
  if (!publicKey) return null;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const sub = subscription.toJSON();
  await fetch('/api/v1/push_subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: sub.keys,
      expirationTime: sub.expirationTime,
    }),
  });

  return subscription;
}

export async function unsubscribeFromPush(registration) {
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await subscription.unsubscribe();

  const endpoints = await fetch('/api/v1/push_subscriptions', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  }).then((r) => r.json());

  const match = endpoints.data?.find((s) => s.endpoint === subscription.endpoint);
  if (match?.id) {
    await fetch(`/api/v1/push_subscriptions/${match.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
  }
}

export async function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function isPushSubscribed(registration) {
  const sub = await registration.pushManager.getSubscription();
  return !!sub;
}
