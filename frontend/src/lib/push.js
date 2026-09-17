import { api } from './api';

async function getVapidKey() {
  const data = await api.request('/api/v1/push_subscriptions/vapid_public_key');
  return data.public_key;
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
  await api.request('/api/v1/push_subscriptions', {
    method: 'POST',
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

  // Drop the server row first: unsubscribing locally first would orphan the row
  // if this lookup failed, leaving a subscription the push service rejects (410).
  const data = await api.request('/api/v1/push_subscriptions');

  const match = data.data?.find((s) => s.endpoint === subscription.endpoint);
  if (match?.id) {
    await api.request(`/api/v1/push_subscriptions/${match.id}`, { method: 'DELETE' });
  }

  await subscription.unsubscribe();
}

export async function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function isPushSubscribed(registration) {
  const sub = await registration.pushManager.getSubscription();
  return !!sub;
}
