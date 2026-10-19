import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
});

export async function sendVerificationEmail(email, name, token) {
  const url = `${config.clientUrl}/verify-email/${token}`;

  if (!config.smtp.host) {
    // No SMTP configured (local dev) — just print the link
    console.log(`📧 [dev] Verification link for ${email}: ${url}`);
    return;
  }

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Verify your email address',
    html: `
      <h2>Welcome, ${name}!</h2>
      <p>Click the link below to verify your email address (valid for 24 hours):</p>
      <p><a href="${url}">${url}</a></p>
      <p>If you didn't create an account, ignore this email.</p>
    `,
  });
}
