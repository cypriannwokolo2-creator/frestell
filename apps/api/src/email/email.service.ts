import { Injectable, Logger } from '@nestjs/common';
import { ENV } from '../config/env';
import { emailTemplate } from './email-template';

interface SendEmailParams {
  subject: string;
  html: string;
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly enabled: boolean;

  constructor() {
    this.enabled = !!ENV.BREVO_API_KEY;
    if (!this.enabled) {
      this.logger.warn('BREVO_API_KEY not set, emails will be logged to console only');
    }
  }

  async send(to: string, params: SendEmailParams): Promise<void> {
    if (!this.enabled) {
      this.logger.log(`[EMAIL] To: ${to} | Subject: ${params.subject} | Body: ${params.html.substring(0, 200)}...`);
      return;
    }

    const body = {
      sender: { name: ENV.BREVO_SENDER_NAME, email: ENV.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject: params.subject,
      htmlContent: params.html,
    };

    try {
      const res = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': ENV.BREVO_API_KEY!,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`Brevo API error ${res.status}: ${text.substring(0, 500)}`);
        return;
      }

      this.logger.log(`Email sent to ${to}: ${params.subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`);
    }
  }

  async sendVerificationEmailOtp(to: string, otp: string): Promise<void> {
    await this.send(to, {
      subject: 'Your verification code — FreStell',
      html: emailTemplate({
        title: 'Verify your email',
        body: 'Thanks for creating a FreStell account. Enter the 6-digit code below to verify your email address.',
        otp,
        warning: 'This code expires in 24 hours. If you didn\'t create an account, ignore this email.',
      }),
    });
  }

  async sendPasswordResetEmail(to: string, otp: string): Promise<void> {
    await this.send(to, {
      subject: 'Password reset code — FreStell',
      html: emailTemplate({
        title: 'Reset your password',
        body: 'Enter the 6-digit code below to reset your password.',
        otp,
        warning: 'This code expires in 15 minutes. If you didn\'t request this, ignore this email.',
      }),
    });
  }

  async sendLockoutNotification(to: string, minutes: number): Promise<void> {
    await this.send(to, {
      subject: 'Account locked — FreStell',
      html: emailTemplate({
        title: 'Account temporarily locked',
        body: `Your account has been locked due to too many failed login attempts. Try again in ${minutes} minutes.`,
        warning: 'If this wasn\'t you, please reset your password immediately.',
      }),
    });
  }

  async send2FAEnabledEmail(to: string): Promise<void> {
    await this.send(to, {
      subject: 'Two-factor authentication enabled — FreStell',
      html: emailTemplate({
        title: '2FA enabled',
        body: 'Two-factor authentication has been enabled on your FreStell account.',
        warning: 'If you didn\'t do this, reset your password immediately.',
      }),
    });
  }

  async send2FADisabledEmail(to: string): Promise<void> {
    await this.send(to, {
      subject: 'Two-factor authentication disabled — FreStell',
      html: emailTemplate({
        title: '2FA disabled',
        body: 'Two-factor authentication has been disabled on your FreStell account.',
        warning: 'If you didn\'t do this, reset your password immediately.',
      }),
    });
  }

  async sendPasswordChangedEmail(to: string): Promise<void> {
    await this.send(to, {
      subject: 'Password changed — FreStell',
      html: emailTemplate({
        title: 'Password changed',
        body: 'Your FreStell password has been changed successfully.',
        warning: 'If you didn\'t do this, reset your password immediately.',
      }),
    });
  }

  async sendWelcomeEmail(to: string): Promise<void> {
    await this.send(to, {
      subject: 'Welcome to FreStell!',
      html: emailTemplate({
        title: 'Welcome to FreStell',
        body: 'Your account is ready. Start exploring FreStell — connect with freelancers, post jobs, and grow your business.',
        cta: { label: 'Get Started', url: `${ENV.BASE_URL}/dashboard` },
        warning: 'If you didn\'t create this account, please contact support.',
      }),
    });
  }

  async sendAccountDeletedEmail(to: string, restoreDays: number): Promise<void> {
    const restoreUrl = `${ENV.WEBAPP_URL}/restore-account`;
    await this.send(to, {
      subject: 'Account deletion scheduled — FreStell',
      html: emailTemplate({
        title: 'Account deletion scheduled',
        body: `Your FreStell account has been scheduled for deletion. You have ${restoreDays} days to restore it by visiting the link below.`,
        cta: { label: 'Restore Account', url: restoreUrl },
        warning: 'If you didn\'t request this, you can safely ignore this email.',
      }),
    });
  }

  async sendExpiryReminderEmail(to: string, jobTitle: string, deadline: Date): Promise<void> {
    await this.send(to, {
      subject: `Job "${jobTitle}" expires soon — FreStell`,
      html: emailTemplate({
        title: 'Job expiring soon',
        body: `Your job "${jobTitle}" is expiring on ${deadline.toLocaleDateString()}. Once it expires, freelancers will no longer be able to apply.`,
        cta: { label: 'View Job', url: `${ENV.WEBAPP_URL}/dashboard/clients/jobs` },
        warning: 'If no action is taken, this job will be automatically archived after the deadline.',
      }),
    });
  }
}
