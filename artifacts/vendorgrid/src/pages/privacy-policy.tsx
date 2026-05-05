export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-foreground">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm mb-10">Last updated: May 5, 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
        <p className="text-muted-foreground leading-relaxed">
          VendorGrid ("we," "us," or "our") operates the VendorGrid platform available at{" "}
          <a href="https://www.vendorgrid.net" className="text-primary underline">
            www.vendorgrid.net
          </a>{" "}
          and through our mobile application. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services. Please read this policy carefully. If you disagree with its terms, please stop using VendorGrid.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
        <h3 className="font-semibold mb-2">Information you provide directly</h3>
        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 mb-4">
          <li>Name and email address (when you create an account)</li>
          <li>Profile information (business name, website, bio, vendor category)</li>
          <li>Payment information (processed securely by Stripe — we never store card numbers)</li>
          <li>Event details you create or register for</li>
          <li>Messages sent in community chat</li>
          <li>Files and documents you upload</li>
          <li>Cost-of-goods and inventory data you enter in the COGS tracker</li>
        </ul>
        <h3 className="font-semibold mb-2">Information collected automatically</h3>
        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1">
          <li>Log data (IP address, browser type, pages visited, time and date)</li>
          <li>Device information (device type, operating system)</li>
          <li>Session data stored in cookies to keep you logged in</li>
          <li>Notification preferences and read status</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1">
          <li>Create and manage your account</li>
          <li>Process event registrations and subscription payments</li>
          <li>Send notifications about events, registrations, and community activity</li>
          <li>Display your public vendor profile to event organizers and attendees</li>
          <li>Provide customer support and respond to inquiries</li>
          <li>Detect and prevent fraud or abuse</li>
          <li>Improve and develop new features of the platform</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          We use the following third-party services to operate VendorGrid:
        </p>
        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2">
          <li>
            <strong className="text-foreground">Stripe</strong> — payment processing for subscriptions. Your payment data is governed by{" "}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Stripe's Privacy Policy
            </a>.
          </li>
          <li>
            <strong className="text-foreground">Supabase</strong> — file and image storage (vendor photos, documents). Data is stored on servers in the United States.
          </li>
          <li>
            <strong className="text-foreground">Railway</strong> — cloud hosting for our servers and database.
          </li>
          <li>
            <strong className="text-foreground">Google Fonts</strong> — fonts loaded from Google's CDN. Subject to{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Google's Privacy Policy
            </a>.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Data Sharing and Disclosure</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          We do not sell, trade, or rent your personal information. We may share information in these limited circumstances:
        </p>
        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1">
          <li>With service providers listed in Section 4 who process data on our behalf</li>
          <li>Your public vendor profile is visible to other VendorGrid users</li>
          <li>Event organizers can see names of vendors who registered for their event</li>
          <li>When required by law, court order, or government authority</li>
          <li>To protect the rights, property, or safety of VendorGrid, our users, or the public</li>
          <li>In connection with a merger, acquisition, or sale of assets (you will be notified)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
        <p className="text-muted-foreground leading-relaxed">
          We retain your account data for as long as your account is active or as needed to provide services. If you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal or financial compliance purposes (e.g., payment records may be kept for up to 7 years).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Your Rights and Choices</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">You have the right to:</p>
        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1">
          <li>Access the personal information we hold about you</li>
          <li>Correct inaccurate or incomplete information through your profile settings</li>
          <li>Request deletion of your account and associated data</li>
          <li>Opt out of non-essential email communications</li>
          <li>Export your data (contact us to request a data export)</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-3">
          To exercise any of these rights, contact us at{" "}
          <a href="mailto:support@vendorgrid.net" className="text-primary underline">
            support@vendorgrid.net
          </a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Security</h2>
        <p className="text-muted-foreground leading-relaxed">
          We use industry-standard measures including HTTPS encryption, secure session management, and access controls to protect your data. However, no method of transmission over the Internet is 100% secure. We encourage you to use a strong, unique password and to contact us immediately if you suspect unauthorized access to your account.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
        <p className="text-muted-foreground leading-relaxed">
          VendorGrid is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will delete it promptly.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
        <p className="text-muted-foreground leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date and, where appropriate, by email. Your continued use of VendorGrid after changes become effective constitutes your acceptance of the revised policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
        <p className="text-muted-foreground leading-relaxed">
          If you have questions or concerns about this Privacy Policy, please contact us:
        </p>
        <div className="mt-3 text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground">VendorGrid</p>
          <p>
            Email:{" "}
            <a href="mailto:support@vendorgrid.net" className="text-primary underline">
              support@vendorgrid.net
            </a>
          </p>
          <p>
            Website:{" "}
            <a href="https://www.vendorgrid.net" className="text-primary underline">
              www.vendorgrid.net
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
