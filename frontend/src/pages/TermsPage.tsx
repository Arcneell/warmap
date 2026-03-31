import { Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'

export function TermsPage() {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="max-w-3xl mx-auto px-8 sm:px-12 lg:px-16 py-12 sm:py-16 lg:py-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-mono text-sepia hover:text-wax-red mb-10 sm:mb-12 transition-colors leading-loose border-b border-dashed border-transparent hover:border-ink pb-1"
        >
          <ArrowLeft size={16} strokeWidth={1.75} className="text-ink shrink-0" /> Back to the chart
        </Link>

        <article className="rulebook-frame bg-parchment p-10 sm:p-12 lg:p-16 space-y-12">
          <header className="text-center space-y-6 pb-4">
            <div className="flex justify-center text-wax-red">
              <Shield size={28} strokeWidth={1.75} />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-wax-red tracking-wide leading-loose border-b border-black/30 pb-8 max-w-lg mx-auto">
              Terms of service
            </h1>
          </header>

          <p className="text-ink font-display font-semibold text-base sm:text-lg border-l-4 border-wax-red pl-6 py-2 leading-loose max-w-2xl mx-auto text-center sm:text-left">
            Last updated: March 2026. By using Wardrove, you agree to these terms.
          </p>

          <div className="space-y-10 sm:space-y-12 text-sm sm:text-base text-sepia leading-loose max-w-none">
            <Section title="1. Acceptance of terms">
              <p>
                By creating an account, uploading data, or otherwise using the Wardrove platform (&quot;Service&quot;),
                you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Service.
              </p>
            </Section>

            <Section title="2. Description of service">
              <p>
                Wardrove is a self-hosted wardriving data aggregation and visualization platform with RPG progression
                mechanics. Users can upload wireless network observation data captured through legitimate wardriving
                activities, view network maps, earn experience points, unlock badges, and compete on leaderboards.
              </p>
            </Section>

            <Section title="3. User data & uploads">
              <p>By uploading data to Wardrove, you represent and warrant that:</p>
              <ul className="list-disc pl-6 sm:pl-8 space-y-3 mt-4 marker:text-wax-red">
                <li>You have the legal right to collect and share the data you upload.</li>
                <li>The data was collected in compliance with all applicable local, national, and international laws.</li>
                <li>The data does not contain personally identifiable information (PII) beyond what is publicly broadcast by wireless devices.</li>
                <li>You understand that uploaded data may be aggregated with data from other users and displayed publicly.</li>
              </ul>
            </Section>

            <Section title="4. Data license">
              <p>
                By uploading data to the Service, you grant Wardrove a non-exclusive, worldwide, royalty-free license
                to store, process, aggregate, display, and distribute the uploaded data as part of the Service.
                You retain ownership of your original capture files.
              </p>
            </Section>

            <Section title="5. Acceptable use">
              <p>You agree NOT to:</p>
              <ul className="list-disc pl-6 sm:pl-8 space-y-3 mt-4 marker:text-wax-red">
                <li>Upload falsified, fabricated, or intentionally misleading data.</li>
                <li>Use the Service to facilitate unauthorized access to any network or device.</li>
                <li>Attempt to exploit, disrupt, or overload the Service infrastructure.</li>
                <li>Scrape, mirror, or redistribute the aggregate dataset without permission.</li>
                <li>Create multiple accounts to manipulate leaderboards or badge progression.</li>
              </ul>
            </Section>

            <Section title="6. Privacy">
              <p>Wardrove collects the minimum data necessary to operate: GitHub username, email, avatar (from OAuth),
                wireless network observations, and usage data (XP, badges, uploads). We do not sell personal data.</p>
            </Section>

            <Section title="7. Disclaimer">
              <p>
                The Service is provided &quot;AS IS&quot; without warranty. Wardriving legality varies by jurisdiction.
                You are solely responsible for ensuring your data collection activities comply with applicable laws.
              </p>
            </Section>

            <Section title="8. Open source">
              <p>
                Wardrove is open-source software (MIT License). These Terms apply to this specific instance,
                not to the software itself. Self-hosted instances may have their own terms.
              </p>
            </Section>
          </div>
        </article>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-black/15 pb-10 last:border-0 last:pb-0">
      <h2 className="font-display text-lg font-bold text-gold-tarnish mb-4 text-center sm:text-left leading-loose">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
