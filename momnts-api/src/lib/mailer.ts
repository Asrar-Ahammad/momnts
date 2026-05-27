import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_APP_PASSWORD,
  },
});

/**
 * Send OTP verification email with styled HTML template.
 * OTP is displayed in the email body — never logged server-side.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #fafafa; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 28px; font-weight: 700; color: #111; margin: 0;">Momnts</h1>
      </div>
      <div style="background: #fff; border-radius: 12px; padding: 32px 24px; border: 1px solid #e5e5e5;">
        <h2 style="font-size: 20px; font-weight: 600; color: #111; margin: 0 0 8px;">Verify your email</h2>
        <p style="font-size: 14px; color: #666; margin: 0 0 24px; line-height: 1.5;">
          Enter this code to verify your email address. It expires in 10 minutes.
        </p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 12px; color: #999; margin: 0; line-height: 1.5;">
          If you didn't request this code, you can safely ignore this email.
          Never share this code with anyone.
        </p>
      </div>
      <p style="font-size: 11px; color: #bbb; text-align: center; margin-top: 24px;">
        &copy; ${new Date().getFullYear()} Momnts. All rights reserved.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Momnts" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: "Your Momnts verification code",
    html,
  });
}

/**
 * Send OTP for password reset or change with styled HTML template.
 */
export async function sendPasswordResetOtpEmail(to: string, otp: string): Promise<void> {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #fafafa; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 28px; font-weight: 700; color: #111; margin: 0;">Momnts</h1>
      </div>
      <div style="background: #fff; border-radius: 12px; padding: 32px 24px; border: 1px solid #e5e5e5;">
        <h2 style="font-size: 20px; font-weight: 600; color: #111; margin: 0 0 8px;">Reset your password</h2>
        <p style="font-size: 14px; color: #666; margin: 0 0 24px; line-height: 1.5;">
          Enter this code to reset your Momnts account password. It expires in 10 minutes.
        </p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 12px; color: #999; margin: 0; line-height: 1.5;">
          If you didn't request a password reset, you can safely ignore this email.
          Your password will not be changed.
        </p>
      </div>
      <p style="font-size: 11px; color: #bbb; text-align: center; margin-top: 24px;">
        &copy; ${new Date().getFullYear()} Momnts. All rights reserved.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Momnts" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: "Reset your Momnts password",
    html,
  });
}
