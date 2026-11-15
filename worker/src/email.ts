// Email via Resend's REST API (plain fetch, no SDK). Free tier: 100/day,
// 3k/month — fine at household scale. Dev no-op when no key is configured.

export type EmailMessage = { to: string; subject: string; text: string };

export const EMAIL_FROM = 'Sampada <noreply@sampada.app>';

export async function sendEmail(env: { RESEND_API_KEY?: string }, msg: EmailMessage): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.log(JSON.stringify({ email: 'skipped (no RESEND_API_KEY)', to: msg.to, subject: msg.subject }));
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to: msg.to, subject: msg.subject, text: msg.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(JSON.stringify({ email: 'failed', status: res.status, subject: msg.subject }));
    return res.ok;
  } catch (error) {
    console.error(JSON.stringify({ email: 'failed', error: String(error), subject: msg.subject }));
    return false;
  }
}
