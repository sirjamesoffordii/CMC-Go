/**
 * Send password reset code via Resend (when RESEND_API_KEY is set).
 * Otherwise the code is only logged server-side; in dev the UI can prompt to check the console.
 */

const RESEND_API = "https://api.resend.com/emails";

export type SendPasswordResetResult =
  | { sent: true }
  | { sent: false; reason: "no_api_key" | "send_failed"; error?: string };

export async function sendPasswordResetEmail(
  apiKey: string | undefined,
  fromEmail: string,
  toEmail: string,
  code: string
): Promise<SendPasswordResetResult> {
  if (!apiKey || !apiKey.trim()) {
    return { sent: false, reason: "no_api_key" };
  }

  const from = fromEmail || "CMC Go <onboarding@resend.dev>";
  const subject = "Your password reset code";
  const html = `
    <p>You requested a password reset for CMC Go.</p>
    <p>Your 6-digit code is: <strong>${code}</strong></p>
    <p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
  `.trim();

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[PasswordReset] Resend API error:", res.status, text);
      return {
        sent: false,
        reason: "send_failed",
        error: text.slice(0, 200),
      };
    }
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[PasswordReset] Send failed:", message);
    return { sent: false, reason: "send_failed", error: message };
  }
}
