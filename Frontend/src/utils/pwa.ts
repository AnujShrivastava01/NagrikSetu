let deferredPrompt: any = null;
let listeners: Array<(available: boolean) => void> = [];
let isInitialized = false;

export function initPWA() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  console.log('🔧 Initializing PWA - allowing browser native install prompts...');

  // Let the browser handle install prompts natively
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    console.log('📱 PWA install prompt available - browser will handle natively');
    // Don't prevent default - let browser show its native install prompt
    // @ts-ignore
    deferredPrompt = e;
    listeners.forEach((cb) => cb(true));
  });

  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA app installed successfully');
    deferredPrompt = null;
    localStorage.setItem('pwa_installed', 'true');
    // Clean up any old custom install prompt data
    localStorage.removeItem('pwaPromptDismissed');
    listeners.forEach((cb) => cb(false));
  });

  // Handle when the app is already installed
  if (isStandalone()) {
    console.log('📱 App is already installed (standalone mode)');
    localStorage.setItem('pwa_installed', 'true');
  }
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
  const canInstallPWA = !!deferredPrompt && !isStandalone();
  console.log('🔍 Can install PWA:', canInstallPWA, 'deferredPrompt:', !!deferredPrompt, 'isStandalone:', isStandalone());
  return canInstallPWA;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn('⚠️ No deferred prompt available for PWA install');
    return false;
  }
  
  try {
    console.log('🚀 Prompting PWA install...');
    // @ts-ignore
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    console.log('📱 PWA install choice result:', choiceResult.outcome);
    
    // reset the prompt after response
    deferredPrompt = null;
    listeners.forEach((cb) => cb(false));
    return choiceResult.outcome === 'accepted';
  } catch (error) {
    console.error('❌ PWA install prompt failed:', error);
    return false;
  }
}

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
  listeners.forEach((cb) => cb(false));
}
