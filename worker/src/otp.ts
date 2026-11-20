import { sha256Hex } from './session';

// Email OTP primitives. The raw code never reaches D1 or logs.
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtpCode(bytes?: Uint32Array): string {
  const value = bytes ? bytes[0] : crypto.getRandomValues(new Uint32Array(1))[0];
  return String(value % 1_000_000).padStart(6, '0');
}

export function otpHash(email: string, code: string): Promise<string> {
  return sha256Hex(`${email.trim().toLowerCase()}:${code}`);
}

export function otpExpired(expiresAt: string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}
