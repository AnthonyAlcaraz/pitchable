import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PeachLogo } from '@/components/icons/PeachLogo';

export function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <PeachLogo className="h-5 w-5" />
            <span className="font-semibold text-white">Pitchable</span>
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-sm text-gray-400">Privacy Policy</span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mb-10 text-sm text-gray-500">Last updated: March 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          {/* 1. Data We Collect */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">1. Data We Collect</h2>
            <p className="mb-3">We collect the following categories of data:</p>

            <h3 className="mb-2 mt-4 font-medium text-white">Account Information</h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>Email address and display name (provided during registration)</li>
              <li>Hashed password (never stored in plaintext)</li>
              <li>Account tier and credit balance</li>
              <li>Registration and login IP addresses (hashed for abuse prevention)</li>
            </ul>

            <h3 className="mb-2 mt-4 font-medium text-white">Presentation Data</h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>Presentations and slides you create</li>
              <li>Knowledge base documents you upload (PDFs, DOCX, text, URLs)</li>
              <li>Pitch Briefs and Pitch Lenses you configure</li>
              <li>AI-generated images associated with your presentations</li>
            </ul>

            <h3 className="mb-2 mt-4 font-medium text-white">Usage Analytics</h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>Feature usage events (e.g., presentation created, export downloaded)</li>
              <li>Generation metrics (model used, token counts, latency)</li>
              <li>Session activity (page views, time on page)</li>
              <li>IP address hashes for rate limiting and security</li>
            </ul>
          </section>

          {/* 2. How We Use Your Data */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">2. How We Use Your Data</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong className="text-white">Service delivery:</strong> Processing your presentations, managing your knowledge base, generating AI content, and handling exports.</li>
              <li><strong className="text-white">Analytics:</strong> Understanding usage patterns to improve the platform, optimize performance, and prioritize features.</li>
              <li><strong className="text-white">Security:</strong> Detecting abuse, preventing fraud, enforcing rate limits, and protecting account integrity.</li>
              <li><strong className="text-white">Communication:</strong> Sending password reset emails, billing notifications, and essential service updates.</li>
              <li><strong className="text-white">Improvement:</strong> Aggregated, anonymized usage data helps us improve AI generation quality and platform reliability.</li>
            </ul>
            <p className="mt-3">
              We do not use your uploaded documents or generated presentations to train AI models.
              Your content is processed solely to fulfill your requests.
            </p>
          </section>

          {/* 3. Data Storage & Security */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">3. Data Storage &amp; Security</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>All data is stored in encrypted PostgreSQL databases with TLS in transit.</li>
              <li>Passwords are hashed using Argon2id, the current OWASP recommendation for password storage.</li>
              <li>API keys are hashed before storage and displayed only once at creation.</li>
              <li>Uploaded files are stored in encrypted object storage (S3-compatible) with per-user isolation.</li>
              <li>JWT refresh tokens are stored as Argon2 hashes, invalidated on logout and password change.</li>
              <li>Account lockout activates after 5 failed login attempts (15-minute cooldown).</li>
            </ul>
          </section>

          {/* 4. Third-Party Services */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">4. Third-Party Services</h2>
            <p className="mb-3">We share data with the following third parties, solely as necessary to operate the Service:</p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 text-left font-medium text-white">Provider</th>
                    <th className="py-2 pr-4 text-left font-medium text-white">Purpose</th>
                    <th className="py-2 text-left font-medium text-white">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="text-gray-400">
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">Stripe</td>
                    <td className="py-2 pr-4">Payment processing &amp; billing</td>
                    <td className="py-2">Email, subscription tier, payment method (handled by Stripe)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">Anthropic</td>
                    <td className="py-2 pr-4">AI content generation</td>
                    <td className="py-2">Presentation prompts, knowledge base excerpts (per-request, not stored by Anthropic)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">AWS S3</td>
                    <td className="py-2 pr-4">File &amp; image storage</td>
                    <td className="py-2">Uploaded documents, generated images, exported presentations</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Resend</td>
                    <td className="py-2 pr-4">Transactional email delivery</td>
                    <td className="py-2">Email address, email content (password resets, notifications)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3">
              We do not sell your personal data to third parties. We do not use third-party
              advertising or tracking services.
            </p>
          </section>

          {/* 5. Cookies & Local Storage */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">5. Cookies &amp; Local Storage</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong className="text-white">localStorage:</strong> We store authentication tokens (JWT) and user preferences in your browser&apos;s localStorage. These are essential for the Service to function and are not shared with third parties.</li>
              <li><strong className="text-white">Session data:</strong> Theme preferences, language settings, and UI state are stored locally in your browser.</li>
              <li>We do not use third-party tracking cookies or analytics cookies.</li>
            </ul>
          </section>

          {/* 6. Your Rights */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">6. Your Rights (GDPR Compliant)</h2>
            <p className="mb-3">You have the following rights regarding your personal data:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong className="text-white">Access:</strong> Request a copy of all personal data we hold about you.</li>
              <li><strong className="text-white">Rectification:</strong> Update or correct inaccurate personal information through your account settings.</li>
              <li><strong className="text-white">Deletion:</strong> Delete your account and all associated data through the account settings page. Deletion is permanent and cannot be undone.</li>
              <li><strong className="text-white">Portability:</strong> Export your presentations in standard formats (HTML, PPTX, PDF) at any time.</li>
              <li><strong className="text-white">Restriction:</strong> Request that we limit processing of your data while resolving a dispute.</li>
              <li><strong className="text-white">Objection:</strong> Object to data processing based on legitimate interests.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@pitch-able.ai" className="text-orange-400 hover:text-orange-300 underline">
                privacy@pitch-able.ai
              </a>. We will respond within 30 days.
            </p>
          </section>

          {/* 7. Data Retention */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">7. Data Retention</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 text-left font-medium text-white">Data Type</th>
                    <th className="py-2 text-left font-medium text-white">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="text-gray-400">
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">Account data</td>
                    <td className="py-2">Until account deletion</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">Presentations &amp; documents</td>
                    <td className="py-2">Until account deletion</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">Activity events</td>
                    <td className="py-2">90 days (auto-purged)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">Generation metrics</td>
                    <td className="py-2">180 days (auto-purged)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">IP address logs</td>
                    <td className="py-2">90 days</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Billing records</td>
                    <td className="py-2">7 years (legal requirement)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              After account deletion, all personal data is permanently removed within 30 days,
              except billing records retained for legal compliance.
            </p>
          </section>

          {/* 8. Children's Privacy */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">8. Children&apos;s Privacy</h2>
            <p>
              Pitchable is not directed at children under 18. We do not knowingly collect personal
              information from children. If you believe a child has provided us with personal data,
              please contact us at privacy@pitch-able.ai and we will promptly delete it.
            </p>
          </section>

          {/* 9. Changes */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be
              communicated via email at least 30 days before they take effect. The &quot;Last
              updated&quot; date at the top reflects the most recent revision.
            </p>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">10. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at{' '}
              <a
                href="mailto:privacy@pitch-able.ai"
                className="text-orange-400 hover:text-orange-300 underline"
              >
                privacy@pitch-able.ai
              </a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a0a0f] py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <PeachLogo className="h-4 w-4" />
            <span className="text-sm text-gray-500">Pitchable</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link to="/terms" className="hover:text-gray-300">Terms of Service</Link>
            <Link to="/" className="hover:text-gray-300">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PrivacyPolicyPage;
