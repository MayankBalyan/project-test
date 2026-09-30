import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

/** The public website: privacy policy, account deletion page and support. */
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://istel.space';
export const SUPPORT_EMAIL = 'support@istel.space';

export const siteLinks = {
  privacy: `${SITE_URL}/privacy`,
  deleteAccount: `${SITE_URL}/delete-account`,
};

/** Opens a page of the website in an in-app browser (a new tab on the web). */
export function openSitePage(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  WebBrowser.openBrowserAsync(url).catch(() => {});
}
