// Session model: opaque 32-byte random token in an HttpOnly cookie; only the
// SHA-256 hex of the token is stored in D1 (`sessions.token`, TEXT UNIQUE).

export const SESSION_COOKIE = 'sampada_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SafeUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  onboarded: boolean | null;
  theme: string | null;
  currency: string | null;
  timezone: string | null;
};

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += String.fromCharCode(b);
  return btoa(out).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Cookie attributes. `Secure` is skipped for http+localhost so local dev works. */
export function sessionCookieFlags(url: string | undefined | null): string {
  let secure = true;
  try {
    secure = new URL(url || '').protocol !== 'http:' || !/(^|\.)localhost$/.test(new URL(url || '').hostname);
  } catch {
    // Unparseable URL — default to requiring Secure.
  }
  return `HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`;
}

export function sessionCookieHeader(token: string, url: string | undefined | null): string {
  return `${SESSION_COOKIE}=${token}; ${sessionCookieFlags(url)}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

export function readSessionToken(cookieHeader: string | undefined | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === SESSION_COOKIE) return part.slice(idx + 1).trim();
  }
  return null;
}
