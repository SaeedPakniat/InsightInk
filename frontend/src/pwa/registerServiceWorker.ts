type ServiceWorkerOptions = {
  enabled?: boolean
}

export async function registerServiceWorker({
  enabled = import.meta.env.PROD,
}: ServiceWorkerOptions = {}): Promise<ServiceWorkerRegistration | null> {
  if (!enabled || !('serviceWorker' in navigator)) return null

  try {
    return await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    })
  } catch {
    return null
  }
}
