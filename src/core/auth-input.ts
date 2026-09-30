export const OTP_LENGTH = 6;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** A light check that catches typos; the server does the real validation. */
export function isValidEmail(email: string): boolean {
  const e = normalizeEmail(email);
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

/** Keeps digits only, so pasted codes like "123 456" work. */
export function normalizeOtp(code: string): string {
  return code.replace(/\D/g, '').slice(0, OTP_LENGTH);
}

export function isCompleteOtp(code: string): boolean {
  return normalizeOtp(code).length === OTP_LENGTH;
}

/**
 * Reads the result of an OAuth redirect (PKCE flow). The provider returns `?code=` on success and
 * `error_description` on failure, in the query string or the fragment.
 */
export function parseAuthRedirect(url: string): { code?: string; error?: string } {
  const q = url.indexOf('?');
  const h = url.indexOf('#');
  const query = q >= 0 ? url.slice(q + 1, h > q ? h : undefined) : '';
  const hash = h >= 0 ? url.slice(h + 1) : '';
  const params = new URLSearchParams(query);
  new URLSearchParams(hash).forEach((value, key) => params.set(key, value));
  const error = params.get('error_description') ?? params.get('error') ?? undefined;
  if (error) return { error };
  const code = params.get('code') ?? undefined;
  return code ? { code } : {};
}
