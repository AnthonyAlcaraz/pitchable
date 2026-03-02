import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ── Interfaces ──────────────────────────────────────────────

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

interface ResendResponse {
  id?: string;
  message?: string;
  statusCode?: number;
}

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;
  private readonly fromAddress = 'Pitchable <noreply@pitch-able.ai>';
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

    if (!this.apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is not set — EmailService will not be operational',
      );
    }
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'RESEND_API_KEY is not configured' };
    }

    const payload = {
      from: this.fromAddress,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    };

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as ResendResponse;

      if (!response.ok) {
        const errMsg = data.message || `HTTP ${response.status}`;
        this.logger.error(`Resend API error: ${errMsg}`);
        return { success: false, error: errMsg };
      }

      this.logger.log(`Email sent to ${options.to} (id: ${data.id})`);
      return { success: true, id: data.id };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Email send failed: ${msg}`);
      return { success: false, error: msg };
    }
  }

  // ── Transactional email methods ──────────────────────────────

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    const html = this.wrapEmailLayout(
      'Verify your email',
      `<h1 style="font-size:24px;font-weight:700;color:#f1f5f9;margin:0 0 8px 0;">Welcome, ${this.escapeHtml(name)}!</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px 0;">
        Thanks for signing up for Pitchable. Please verify your email address to get started.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#0ea5e9;color:#0f172a;font-size:14px;font-weight:600;padding:12px 32px;border-radius:6px;text-decoration:none;">
        Verify Email Address
      </a>
      <p style="color:#64748b;font-size:12px;margin:24px 0 0 0;">
        If the button doesn't work, copy and paste this link:<br/>
        <a href="${verifyUrl}" style="color:#0ea5e9;word-break:break-all;">${verifyUrl}</a>
      </p>`,
    );

    const result = await this.sendEmail({ to, subject: 'Verify your Pitchable account', html });
    if (!result.success) {
      this.logger.error(`Failed to send verification email to ${to}: ${result.error}`);
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const dashboardUrl = `${this.frontendUrl}/cockpit`;
    const html = this.wrapEmailLayout(
      'Welcome to Pitchable!',
      `<h1 style="font-size:24px;font-weight:700;color:#f1f5f9;margin:0 0 8px 0;">You're all set, ${this.escapeHtml(name)}!</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px 0;">
        Your email is verified and you have <strong style="color:#0ea5e9;">5 free credits</strong> to get started.
      </p>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;margin:0 0 24px 0;">
        <p style="color:#cbd5e1;font-size:14px;font-weight:600;margin:0 0 12px 0;">Quick Start:</p>
        <ol style="color:#94a3b8;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
          <li>Create a <strong style="color:#cbd5e1;">Pitch Brief</strong> to organize your content</li>
          <li>Upload documents or paste text into your knowledge base</li>
          <li>Generate a polished deck with one click</li>
        </ol>
      </div>
      <a href="${dashboardUrl}" style="display:inline-block;background:#0ea5e9;color:#0f172a;font-size:14px;font-weight:600;padding:12px 32px;border-radius:6px;text-decoration:none;">
        Go to Dashboard
      </a>`,
    );

    const result = await this.sendEmail({ to, subject: 'Welcome to Pitchable!', html });
    if (!result.success) {
      this.logger.error(`Failed to send welcome email to ${to}: ${result.error}`);
    }
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    const html = this.wrapEmailLayout(
      'Reset your password',
      `<h1 style="font-size:24px;font-weight:700;color:#f1f5f9;margin:0 0 8px 0;">Password Reset</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px 0;">
        Hi ${this.escapeHtml(name)}, we received a request to reset your password. Click the button below to choose a new one.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#0ea5e9;color:#0f172a;font-size:14px;font-weight:600;padding:12px 32px;border-radius:6px;text-decoration:none;">
        Reset Password
      </a>
      <p style="color:#64748b;font-size:12px;margin:24px 0 0 0;">
        This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.<br/>
        <a href="${resetUrl}" style="color:#0ea5e9;word-break:break-all;">${resetUrl}</a>
      </p>`,
    );

    const result = await this.sendEmail({ to, subject: 'Reset your Pitchable password', html });
    if (!result.success) {
      this.logger.error(`Failed to send password reset email to ${to}: ${result.error}`);
    }
  }

  async sendLowCreditsEmail(to: string, name: string, balance: number): Promise<void> {
    const billingUrl = `${this.frontendUrl}/billing`;
    const html = this.wrapEmailLayout(
      'Credits running low',
      `<h1 style="font-size:24px;font-weight:700;color:#f1f5f9;margin:0 0 8px 0;">Credits Running Low</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px 0;">
        Hi ${this.escapeHtml(name)}, you have <strong style="color:#f59e0b;">${balance} credit${balance === 1 ? '' : 's'}</strong> remaining in your Pitchable account.
      </p>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:20px;margin:0 0 24px 0;text-align:center;">
        <p style="color:#f59e0b;font-size:36px;font-weight:700;margin:0;">${balance}</p>
        <p style="color:#64748b;font-size:12px;margin:4px 0 0 0;">credits remaining</p>
      </div>
      <a href="${billingUrl}" style="display:inline-block;background:#0ea5e9;color:#0f172a;font-size:14px;font-weight:600;padding:12px 32px;border-radius:6px;text-decoration:none;">
        Buy More Credits
      </a>`,
    );

    const result = await this.sendEmail({ to, subject: 'Your Pitchable credits are running low', html });
    if (!result.success) {
      this.logger.error(`Failed to send low credits email to ${to}: ${result.error}`);
    }
  }

  // ── Shared layout helpers ─────────────────────────────────

  private wrapEmailLayout(title: string, bodyContent: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#0ea5e9;color:#0f172a;font-size:11px;font-weight:700;padding:4px 12px;border-radius:4px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:16px;">PITCHABLE</div>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:32px;text-align:center;">
      ${bodyContent}
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#64748b;font-size:12px;margin:0;">
        Pitchable &middot; AI Presentation Builder &middot; <a href="${this.frontendUrl}" style="color:#0ea5e9;text-decoration:none;">pitch-able.ai</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Build a styled HTML email body for a presentation export.
   */
  buildPresentationEmailHtml(
    title: string,
    slideCount: number,
    format: string,
  ): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#0ea5e9;color:#0f172a;font-size:11px;font-weight:700;padding:4px 12px;border-radius:4px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:16px;">PITCHABLE</div>
      <h1 style="font-size:24px;font-weight:700;color:#f1f5f9;margin:12px 0 8px 0;">${title}</h1>
      <p style="font-size:14px;color:#94a3b8;margin:0;">
        ${slideCount} slides &middot; Exported as ${format.toUpperCase()}
      </p>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:24px;text-align:center;">
      <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
        Your presentation is attached to this email.
      </p>
      <p style="color:#64748b;font-size:12px;margin:0;">
        Generated by Pitchable &middot; AI Presentation Builder
      </p>
    </div>
  </div>
</body>
</html>`;
  }
}
