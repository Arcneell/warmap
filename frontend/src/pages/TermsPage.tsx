import { Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'

export function TermsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to map
        </Link>

        <div className="bg-panel rounded-2xl border border-border p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield size={24} className="text-wifi" />
            <h1 className="font-display text-2xl font-bold text-primary">Terms of Service</h1>
          </div>

          <div className="prose prose-sm prose-invert max-w-none space-y-6 text-secondary leading-relaxed text-sm">
            <p className="text-primary font-semibold">
              Last updated: March 2026. By using Wardrove, you agree to these terms.
            </p>

            <Section title="1. Acceptance of Terms">
              <p>
                By creating an account, uploading data, or otherwise using the Wardrove platform ("Service"),
                you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.
              </p>
            </Section>

            <Section title="2. Description of Service">
              <p>
                Wardrove is a self-hosted wardriving data aggregation and visualization platform with RPG progression
                mechanics. Users can upload wireless network observation data captured through legitimate wardriving
                activities, view network maps, earn experience points, unlock badges, and compete on leaderboards.
              </p>
            </Section>

            <Section title="3. User Data & Uploads">
              <p>
                By uploading data to Wardrove, you represent and warrant that:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You have the legal right to collect and share the data you upload.</li>
                <li>The data was collected in compliance with all applicable local, national, and international laws.</li>
                <li>The data does not contain personally identifiable information (PII) beyond what is publicly
                    broadcast by wireless devices (e.g., SSIDs, BSSIDs, signal strength).</li>
                <li>You understand that uploaded data may be aggregated with data from other users and displayed publicly.</li>
              </ul>
            </Section>

            <Section title="4. Data License">
              <p>
                By uploading data to the Service, you grant Wardrove a non-exclusive, worldwide, royalty-free license
                to store, process, aggregate, display, and distribute the uploaded data as part of the Service.
                You retain ownership of your original capture files. Aggregated and processed data (network locations,
                statistics) becomes part of the collective Wardrove dataset.
              </p>
            </Section>

            <Section title="5. Acceptable Use">
              <p>You agree NOT to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Upload falsified, fabricated, or intentionally misleading data.</li>
                <li>Use the Service to facilitate unauthorized access to any network or device.</li>
                <li>Attempt to exploit, disrupt, or overload the Service infrastructure.</li>
                <li>Scrape, mirror, or redistribute the aggregate dataset without permission.</li>
                <li>Use the Service for any illegal purpose or in violation of any applicable law.</li>
                <li>Create multiple accounts to manipulate leaderboards or badge progression.</li>
              </ul>
            </Section>

            <Section title="6. Privacy & Data Collection">
              <p>
                Wardrove collects the minimum data necessary to operate:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account data:</strong> GitHub username, email (from OAuth), avatar URL.</li>
                <li><strong>Upload data:</strong> Wireless network observations (BSSIDs, SSIDs, signal strength,
                    GPS coordinates, timestamps).</li>
                <li><strong>Usage data:</strong> XP, level, badges earned, upload history.</li>
              </ul>
              <p>
                We do not sell personal data to third parties. Network observation data is aggregated and
                may be publicly visible on maps and statistics pages.
              </p>
            </Section>

            <Section title="7. Account Termination">
              <p>
                We reserve the right to suspend or terminate accounts that violate these Terms, upload malicious data,
                or abuse the Service. You may delete your account at any time by contacting the instance administrator.
              </p>
            </Section>

            <Section title="8. Disclaimer of Warranties">
              <p>
                The Service is provided "AS IS" without warranty of any kind. We make no guarantees about the
                accuracy, completeness, or reliability of any data on the platform. Use the Service at your own risk.
              </p>
            </Section>

            <Section title="9. Limitation of Liability">
              <p>
                In no event shall Wardrove or its operators be liable for any indirect, incidental, special,
                consequential, or punitive damages arising from your use of the Service, including but not limited
                to loss of data, unauthorized access to networks, or legal consequences of wardriving activities.
              </p>
            </Section>

            <Section title="10. Legal Compliance">
              <p>
                Wardriving legality varies by jurisdiction. You are solely responsible for ensuring your
                data collection activities comply with all applicable laws in your area. The Service does not
                encourage or facilitate any illegal activity.
              </p>
            </Section>

            <Section title="11. Changes to Terms">
              <p>
                We may update these Terms from time to time. Continued use of the Service after changes
                constitutes acceptance of the revised Terms. Material changes will be communicated through
                the platform.
              </p>
            </Section>

            <Section title="12. Open Source">
              <p>
                Wardrove is open-source software licensed under the MIT License. These Terms of Service
                apply to the use of this specific instance of the platform, not to the software itself.
                Self-hosted instances may have their own terms.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-primary mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
