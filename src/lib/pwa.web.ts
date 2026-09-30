import { useSyncExternalStore } from 'react';

export type InstallState = 'installed' | 'available' | 'manual';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    /** Set by public/index.html when Chrome offers to install the app before this code has loaded. */
    __istelInstallPrompt?: InstallPromptEvent | null;
  }
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let installed = false;

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Registers the service worker (production builds only) and keeps track of Chrome's install offer. */
export function startPwa() {
  if (typeof window === 'undefined') return;
  if (!__DEV__ && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__istelInstallPrompt = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    window.__istelInstallPrompt = null;
    emit();
  });
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', emit);
}

function getState(): InstallState {
  if (installed || standalone()) return 'installed';
  return window.__istelInstallPrompt ? 'available' : 'manual';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether Istel can be installed from this browser, and a way to ask. */
export function useInstall() {
  const state = useSyncExternalStore(subscribe, getState, () => 'manual' as InstallState);
  const install = async () => {
    const prompt = window.__istelInstallPrompt;
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // Chrome allows each offer to be used once.
    window.__istelInstallPrompt = null;
    emit();
    return outcome === 'accepted';
  };
  return { state, install };
}
