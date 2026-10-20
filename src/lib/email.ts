/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY AUTOMATED TRANSACTIONAL WELCOME EMAIL VIA RESEND
 * Dispatches HTML welcome verification to new waitlist members.
 */

const env = (typeof import.meta !== 'undefined' && import.meta?.env) ? import.meta.env : (process.env as any || {});
const RESEND_API_KEY = (env.VITE_RESEND_API_KEY || env.RESEND_API_KEY) as string | undefined;

let resendWarned = false;
if (!RESEND_API_KEY && !resendWarned) {
  resendWarned = true;
  console.warn('[Resend] VITE_RESEND_API_KEY is undefined. Email dispatch will operate in silent fallback mode.');
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Sends automated welcome email confirmation to new waitlist members via Resend.
 * Fails silently without blocking the UI if API key is missing or request fails.
 */
export async function sendWelcomeEmail(email: string, memberBadgeId: string): Promise<SendEmailResult> {
  const cleanEmail = email.trim().toLowerCase();

  if (!RESEND_API_KEY) {
    console.debug('[Resend] Skipped sending welcome email: VITE_RESEND_API_KEY is undefined.');
    return { success: false, error: 'VITE_RESEND_API_KEY is undefined' };
  }

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>You're on the Member Waitlist!</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050608; color: #f1f5f9; padding: 24px; margin: 0; }
          .container { max-width: 580px; margin: 0 auto; background: #0b0d13; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px; padding: 32px; }
          .badge { display: inline-block; padding: 8px 16px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px; color: #34d399; font-weight: bold; font-family: monospace; font-size: 14px; margin: 16px 0; }
          .highlight { color: #fcd34d; font-weight: bold; }
          .coins { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 12px 16px; margin: 16px 0; color: #fcd34d; font-family: monospace; }
          .footer { font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 style="color: #ffffff; margin-top: 0;">✓ You're on the Member Waitlist!</h2>
          <p>Welcome to <strong>Luckyly.org</strong>. Your early member registration has been successfully recorded in our transparent milestone ledger.</p>
          
          <p>Your official Member Pass ID:</p>
          <div class="badge">${memberBadgeId}</div>
          
          <div class="coins">
            Allocated Balance: <strong>1,500 Member Coins</strong>
          </div>

          <p>Keep this email for your records. As our community milestone thresholds unlock, you'll receive priority updates directly to this address.</p>
          
          <p style="margin-top: 24px;">Warm regards,<br><strong>Nessa</strong><br>Founding Team, Luckyly.org</p>
          
          <div class="footer">
            Luckyly.org · Phase 1 Member Community Waitlist · No purchase necessary.<br>
            If you did not request this registration, you may safely ignore this message.
          </div>
        </div>
      </body>
    </html>
  `.trim();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nessa <nessa@luckyly.org>',
        to: [cleanEmail],
        subject: "✓ You're on the Member Waitlist!",
        html: htmlBody,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('[Resend] Email dispatch notice:', data);
      return { success: false, error: data?.message || 'Resend error' };
    }

    console.info('[Resend] Welcome email dispatched successfully:', cleanEmail, data?.id);
    return { success: true, id: data?.id };
  } catch (err: any) {
    // Fail silently without blocking UI
    console.debug('[Resend] Network notice during email dispatch:', err?.message || err);
    return { success: false, error: err?.message };
  }
}
