import axios from "axios";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let _transporter: Transporter | null = null;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTransporter(): Transporter {
  if (!_transporter) {
    const email = process.env.SMTP_EMAIL;
    const pass = process.env.SMTP_APP_PASSWORD;

    if (!email || !pass) {
      console.error("[Mailer] SMTP_EMAIL or SMTP_APP_PASSWORD is missing from environment variables");
      throw new Error("SMTP credentials not configured");
    }

    _transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // STARTTLS
      auth: { user: email, pass },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });
  }
  return _transporter;
}

const SPARKAGE_BASE_URL = "https://sparkagebackend.greenlancez.com/api/v1/integration";

function getSparkageHeaders() {
  const apiKey = process.env.SPARKAGE_PUBLIC_API_KEY;
  const apiSecret = process.env.SPARKAGE_SECRET_API_KEY;

  if (!apiKey || !apiSecret) {
    console.error("[Sparkage] SPARKAGE_PUBLIC_API_KEY or SPARKAGE_SECRET_API_KEY is missing from environment variables");
    throw new Error("Sparkage API credentials not configured");
  }

  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "x-api-secret": apiSecret,
  };
}

/**
 * Send verification email via Sparkage integration.
 * Sparkage auto-generates, bcrypt-hashes, and stores the secure 6-digit OTP code.
 */
export async function sendOtpEmail(to: string): Promise<void> {
  const headers = getSparkageHeaders();
  const response = await axios.post(`${SPARKAGE_BASE_URL}/auth-email`, {
    recipientEmail: to,
    subject: "Your Momnts verification code",
  }, { headers });

  if (!response.data || response.data.success !== true) {
    throw new Error(response.data?.error || "Failed to send verification email via Sparkage");
  }
}

/**
 * Send password reset email via Sparkage integration.
 * Sparkage auto-generates, bcrypt-hashes, and stores the secure 6-digit OTP code.
 */
export async function sendPasswordResetOtpEmail(to: string): Promise<void> {
  const headers = getSparkageHeaders();
  const response = await axios.post(`${SPARKAGE_BASE_URL}/auth-email`, {
    recipientEmail: to,
    subject: "Reset your Momnts password",
  }, { headers });

  if (!response.data || response.data.success !== true) {
    throw new Error(response.data?.error || "Failed to send password reset email via Sparkage");
  }
}

/**
 * Verify code entered by the user against Sparkage's record.
 */
export async function verifyOtpViaSparkage(email: string, code: string): Promise<boolean> {
  const headers = getSparkageHeaders();
  try {
    const response = await axios.post(`${SPARKAGE_BASE_URL}/verify-otp`, {
      email,
      code,
    }, { headers });

    return response.data && response.data.success === true;
  } catch (error: any) {
    // Sparkage returns 400 for invalid/expired code
    if (error.response && error.response.status === 400) {
      return false;
    }
    throw error;
  }
}

/**
 * Send welcome email via SMTP using a beautiful custom HTML template.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const escapedName = escapeHtml(name);
  const html = `
    <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; width: 100%; box-sizing: border-box;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%); padding: 48px 32px; text-align: center; position: relative;">
          <!-- Subtle Decorative Logo Ring -->
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border-radius: 50%; padding: 12px; margin-bottom: 16px; border: 1px solid rgba(255, 255, 255, 0.25);">
            <span style="font-size: 28px; line-height: 1;">📸</span>
          </div>
          <h1 style="font-size: 32px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: -1px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Momnts</h1>
          <p style="font-size: 14px; color: rgba(255, 255, 255, 0.85); margin: 6px 0 0 0; font-weight: 500; letter-spacing: 0.5px;">Capture &amp; Share Every Angle</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px 32px;">
          <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.5px;">Welcome aboard, ${escapedName}!</h2>
          <p style="font-size: 16px; color: #475569; margin: 0 0 28px 0; line-height: 1.6;">
            We're absolutely thrilled to have you join our community! Momnts is designed to help you curate, share, and relive your favorite memories from live events in real-time. Here's a quick look at what you can do:
          </p>

          <!-- Features Checklist -->
          <div style="margin-bottom: 32px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 16px; background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 0 12px 12px 0; display: block; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                  <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 2px;">📸 Shared Event Galleries</strong>
                  <span style="color: #475569; font-size: 13px; line-height: 1.4; display: block;">Collect high-quality photos from every guest and see the event from all perspectives.</span>
                </td>
              </tr>
              <tr><td style="height: 12px; font-size: 12px; line-height: 12px;">&nbsp;</td></tr>
              <tr>
                <td style="padding: 16px; background-color: #f8fafc; border-left: 4px solid #7c3aed; border-radius: 0 12px 12px 0; display: block; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                  <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 2px;">⚡ Real-Time Updates</strong>
                  <span style="color: #475569; font-size: 13px; line-height: 1.4; display: block;">Watch photos stream in live as people take them, no manual sharing needed.</span>
                </td>
              </tr>
              <tr><td style="height: 12px; font-size: 12px; line-height: 12px;">&nbsp;</td></tr>
              <tr>
                <td style="padding: 16px; background-color: #f8fafc; border-left: 4px solid #db2777; border-radius: 0 12px 12px 0; display: block; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                  <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 2px;">🔒 End-to-End Encryption</strong>
                  <span style="color: #475569; font-size: 13px; line-height: 1.4; display: block;">Select events can be fully encrypted, guaranteeing absolute privacy for your memories.</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Action Button Area -->
          <div style="text-align: center; margin: 36px 0 24px 0;">
            <a href="${process.env.CLIENT_APP_URL || 'http://localhost:5173'}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 14px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3), 0 4px 6px -4px rgba(79, 70, 229, 0.3); letter-spacing: -0.2px;">
              Go to Dashboard
            </a>
          </div>

          <div style="text-align: center;">
            <p style="font-size: 14px; color: #64748b; margin: 0 0 16px 0;">
              Need help getting started? Check out our <a href="${process.env.CLIENT_APP_URL || 'http://localhost:5173'}/help" style="color: #4f46e5; text-decoration: none; font-weight: 500;">Help Center</a>.
            </p>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

          <!-- Footer Info -->
          <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.6; text-align: center;">
            If you didn't create a Momnts account, you can safely ignore this email.
          </p>
        </div>
      </div>

      <!-- Outer Footer -->
      <div style="text-align: center; margin-top: 32px;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0 0 8px 0;">
          &copy; ${new Date().getFullYear()} Momnts Inc. All rights reserved.
        </p>
        <p style="font-size: 11px; color: #cbd5e1; margin: 0;">
          San Francisco, CA &bull; Privacy Policy &bull; Terms of Service
        </p>
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"Momnts" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: "Welcome to Momnts!",
    html,
  });
}

