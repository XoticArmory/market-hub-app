export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-foreground">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-muted-foreground text-sm mb-10">Last updated: May 5, 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground leading-relaxed">
          By creating an account or using the VendorGrid platform — available at{" "}
          <a href="https://www.vendorgrid.net" className="text-primary underline">
            www.vendorgrid.net
          </a>{" "}
          or through our mobile application — you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use VendorGrid. We may update these Terms at any time; continued use after changes are posted constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
        <p className="text-muted-foreground leading-relaxed">
          VendorGrid is a subscription-based marketplace platform that connects artisan vendors with local market events. The platform enables event organizers to create and manage market events, vendors to discover events and register for booth spaces, and community members to communicate via chat. Certain features require a paid subscription.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Eligibility and Accounts</h2>
        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2">
          <li>You must be at least 18 years old to use VendorGrid.</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>You must provide accurate and complete information when registering.</li>
          <li>One person or business entity may not maintain more than one free account.</li>
          <li>VendorGrid reserves the right to suspend or terminate accounts that violate these Terms.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Subscriptions and Payments</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          VendorGrid offers free and paid subscription tiers. By subscribing to a paid plan:
        </p>
        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2">
          <li>You authorize us to charge your payment method on a recurring basis at the rate disclosed at the time of purchase.</li>
          <li>Subscriptions automatically renew unless cancelled before the renewal date.</li>
          <li>You may cancel your subscription at any time through your account settings; access to paid features continues until the end of the current billing period.</li>
          <li>All payments are processed securely by Stripe. VendorGrid does not store your payment card information.</li>
          <li>Fees are non-refundable except as required by applicable law or at our sole discretion.</li>
          <li>We reserve the right to change subscription pricing with at least 30 days' notice.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Vendor and Event Organizer Responsibilities</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          If you use VendorGrid as a vendor or event organizer, you additionally agree to:
        </p>
        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2">
          <li>Provide accurate information about your products, services, and events.</li>
          <li>Honor registrations and commitments made through the platform.</li>
          <li>Comply with all applicable local, state, and federal laws, including business licensing and food safety regulations.</li>
          <li>Resolve disputes with other users directly and in good faith.</li>
          <li>Not misrepresent your identity, qualifications, or the nature of your goods and services.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Acceptable Use</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">You agree not to use VendorGrid to:</p>
        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2">
          <li>Post false, misleading, or fraudulent content.</li>
          <li>Harass, threaten, or harm other users.</li>
          <li>Spam or send unsolicited commercial messages through the platform's chat or notification features.</li>
          <li>Upload malware, viruses, or any code designed to disrupt or damage systems.</li>
          <li>Scrape, crawl, or extract data from VendorGrid without written permission.</li>
          <li>Attempt to gain unauthorized access to other accounts or our systems.</li>
          <li>Use the platform for any illegal purpose.</li>
          <li>Impersonate VendorGrid, its staff, or other users.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. User Content</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          You retain ownership of content you post on VendorGrid (profile information, event listings, chat messages, uploaded files). By posting content, you grant VendorGrid a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content solely to operate and improve the platform. You represent that you have the right to post any content you submit and that it does not infringe any third-party rights.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          VendorGrid reserves the right to remove any content that violates these Terms or that we determine, in our sole discretion, is harmful, offensive, or otherwise inappropriate.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
        <p className="text-muted-foreground leading-relaxed">
          The VendorGrid name, logo, platform design, and software are the exclusive property of VendorGrid and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, modify, distribute, or create derivative works without our express written permission.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">9. Disclaimers</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          VendorGrid is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that:
        </p>
        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1">
          <li>The platform will be uninterrupted, error-free, or secure.</li>
          <li>Any information on the platform is accurate, complete, or current.</li>
          <li>The platform will meet your specific requirements.</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-3">
          VendorGrid is not responsible for the conduct of vendors, event organizers, or other users, whether online or at in-person events.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
        <p className="text-muted-foreground leading-relaxed">
          To the fullest extent permitted by law, VendorGrid and its affiliates, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of — or inability to use — the platform, even if we have been advised of the possibility of such damages. Our total liability for any claim arising out of these Terms shall not exceed the amount you paid to VendorGrid in the 12 months preceding the claim.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">11. Indemnification</h2>
        <p className="text-muted-foreground leading-relaxed">
          You agree to indemnify, defend, and hold harmless VendorGrid and its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including attorneys' fees) arising from your use of the platform, your violation of these Terms, or your violation of any rights of another.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">12. Governing Law and Disputes</h2>
        <p className="text-muted-foreground leading-relaxed">
          These Terms are governed by the laws of the State of Montana, without regard to its conflict of law provisions. Any dispute arising from these Terms or your use of VendorGrid shall first be attempted to be resolved informally by contacting us. If informal resolution fails, disputes shall be resolved by binding arbitration under the rules of the American Arbitration Association, except that either party may seek injunctive relief in a court of competent jurisdiction.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">13. Termination</h2>
        <p className="text-muted-foreground leading-relaxed">
          VendorGrid may suspend or terminate your account and access to the platform at any time, with or without cause, and with or without notice. Upon termination, your right to use the platform ceases immediately. Provisions of these Terms that by their nature should survive termination (including ownership, disclaimers, indemnification, and limitations of liability) will survive.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">14. Contact Us</h2>
        <p className="text-muted-foreground leading-relaxed">
          Questions about these Terms? Contact us:
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
