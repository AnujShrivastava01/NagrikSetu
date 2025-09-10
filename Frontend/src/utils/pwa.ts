let deferredPrompt: any = null;
let listeners: Array<(available: boolean) => void> = [];

export function initPWA() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    // @ts-ignore
    deferredPrompt = e;
    listeners.forEach((cb) => cb(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    localStorage.setItem('pwa_installed', 'true');
    listeners.forEach((cb) => cb(false));
  });
}

export function onInstallAvailabilityChange(cb: (available: boolean) => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari and other browsers
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore
    window.navigator.standalone === true
  );
}

export function canInstall(): boolean {
  return !!deferredPrompt && !isStandalone();
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  // @ts-ignore
  deferredPrompt.prompt();
  const choiceResult = await deferredPrompt.userChoice;
  // reset the prompt after response
  deferredPrompt = null;
  listeners.forEach((cb) => cb(false));
  return choiceResult.outcome === 'accepted';
}
