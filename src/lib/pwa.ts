/** Installing from the browser only applies on the web; phones get the store app. */
export type InstallState = 'installed' | 'available' | 'manual';

export function startPwa() {}

export function useInstall(): { state: InstallState | null; install: () => Promise<boolean> } {
  return { state: null, install: async () => false };
}
