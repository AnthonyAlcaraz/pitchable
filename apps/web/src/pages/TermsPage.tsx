import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PeachLogo } from '@/components/icons/PeachLogo';

export function TermsPage() {
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
          <span className="text-sm text-gray-400">Terms of Service</span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-white">Terms of Service</h1>
        <p className="mb-10 text-sm text-gray-500">Last updated: March 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          {/* 1. Service Description */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">1. Service Description</h2>
            <p>
              Pitchable (&quot;the Service&quot;) is an AI-powered presentation generation platform
              operated at pitch-able.ai. The Service enables users to create professional
              pitch decks and presentations through natural language interaction, knowledge
              base integration, and automated design systems. By accessing or using Pitchable,
              you agree to be bound by these Terms of Service.
            </p>
          </section>

          {/* 2. Account Terms */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">2. Account Terms</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>You must be at least 18 years old to create an account.</li>
              <li>You must provide a valid email address and accurate information during registration.</li>
              <li>You are responsible for maintaining the security of your account credentials, including your password and API keys.</li>
              <li>You must notify us immediately at support@pitch-able.ai if you become aware of any unauthorized access to your account.</li>
              <li>One person or legal entity may not maintain more than one free account.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
            </ul>
          </section>

          {/* 3. Subscription & Billing */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">3. Subscription &amp; Billing</h2>
            <p className="mb-3">
              Pitchable operates on a credit-based system across three tiers:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong className="text-white">Free:</strong> Limited credits for evaluation purposes. No payment required.</li>
              <li><strong className="text-white">Starter ($29/month):</strong> Monthly credit allocation for regular presentation creation.</li>
              <li><strong className="text-white">Pro ($79/month):</strong> Higher credit allocation, priority generation, and advanced features.</li>
            </ul>
            <p className="mt-3">
              Credits are consumed when generating presentations, slides, or images.
              Unused credits do not roll over between billing periods.
              Subscription payments are processed by Stripe. By subscribing, you authorize
              recurring charges to your payment method. You may cancel your subscription at
              any time, and access will continue until the end of the current billing period.
            </p>
          </section>

          {/* 4. Acceptable Use Policy */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">4. Acceptable Use Policy</h2>
            <p className="mb-3">You agree not to use Pitchable to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Generate content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable.</li>
              <li>Create presentations containing misleading financial data or fraudulent claims intended to deceive investors.</li>
              <li>Reverse engineer, decompile, or attempt to extract the source code or AI models.</li>
              <li>Use automated systems (bots, scrapers) to access the Service beyond the provided API.</li>
              <li>Circumvent rate limits, credit restrictions, or other usage controls.</li>
              <li>Share account credentials or API keys with unauthorized parties.</li>
              <li>Upload malicious files or content designed to exploit system vulnerabilities.</li>
            </ul>
            <p className="mt-3">
              Violation of this policy may result in immediate account suspension or termination
              without refund.
            </p>
          </section>

          {/* 5. Intellectual Property */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">5. Intellectual Property</h2>
            <p className="mb-3">
              <strong className="text-white">Your content:</strong> You retain full ownership of all
              presentations, pitch decks, documents, and other content you create using Pitchable.
              We do not claim any intellectual property rights over your generated presentations.
            </p>
            <p className="mb-3">
              <strong className="text-white">Our service:</strong> The Pitchable platform, including its
              AI models, design systems, themes, templates, and software, is protected by intellectual
              property laws. You may not copy, modify, or distribute any part of the Service.
            </p>
            <p>
              <strong className="text-white">Uploaded content:</strong> By uploading documents to your
              knowledge base, you grant Pitchable a limited license to process and index that content
              solely for the purpose of generating presentations on your behalf. We do not use your
              uploaded content to train AI models or share it with other users.
            </p>
          </section>

          {/* 6. Data Handling & Privacy */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">6. Data Handling &amp; Privacy</h2>
            <p>
              Your use of Pitchable is also governed by our{' '}
              <Link to="/privacy" className="text-orange-400 hover:text-orange-300 underline">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your personal data. By using the
              Service, you consent to the data practices described in our Privacy Policy.
            </p>
          </section>

          {/* 7. Limitation of Liability */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">7. Limitation of Liability</h2>
            <p className="mb-3">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties
              of any kind, either express or implied. We do not guarantee that the Service will be
              uninterrupted, error-free, or that AI-generated content will be accurate or suitable for
              any particular purpose.
            </p>
            <p>
              To the maximum extent permitted by law, Pitchable and its operators shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages, or any loss of
              profits or revenue, whether incurred directly or indirectly, resulting from your use of the
              Service. Our total liability for any claim arising from these Terms shall not exceed the
              amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          {/* 8. Termination */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">8. Termination</h2>
            <p className="mb-3">
              You may terminate your account at any time through the account settings page. Upon
              termination, your data will be deleted in accordance with our Privacy Policy retention
              schedule.
            </p>
            <p>
              We reserve the right to suspend or terminate your account at any time for violations
              of these Terms, including the Acceptable Use Policy. We will make reasonable efforts
              to notify you before termination, except where immediate action is required to protect
              the Service or other users.
            </p>
          </section>

          {/* 9. Changes to Terms */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">9. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated
              via email or a prominent notice on the Service at least 30 days before they take effect.
              Continued use of the Service after changes become effective constitutes acceptance of
              the updated Terms.
            </p>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">10. Contact</h2>
            <p>
              For questions or concerns about these Terms, contact us at{' '}
              <a
                href="mailto:support@pitch-able.ai"
                className="text-orange-400 hover:text-orange-300 underline"
              >
                support@pitch-able.ai
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
            <Link to="/privacy" className="hover:text-gray-300">Privacy Policy</Link>
            <Link to="/" className="hover:text-gray-300">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default TermsPage;
