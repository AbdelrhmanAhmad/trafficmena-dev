import Layout from '@/shared/components/layout/Layout';

const PrivacyPolicy = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-bold text-neutral-900">Privacy Policy</h1>
        <p className="mt-4 text-sm text-neutral-500">Last updated: January 2025</p>

        <div className="mt-8 space-y-8 text-neutral-700">
          <section>
            <h2 className="text-xl font-semibold text-neutral-900">1. Information We Collect</h2>
            <p className="mt-3 leading-relaxed">
              We collect information you provide directly to us, such as when you create an account,
              register for events, or contact us for support. This may include your name, email
              address, professional information, and any other information you choose to provide.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              2. How We Use Your Information
            </h2>
            <p className="mt-3 leading-relaxed">
              We use the information we collect to provide, maintain, and improve our services,
              process event registrations, send you updates about events and community activities,
              and respond to your comments and questions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">3. Information Sharing</h2>
            <p className="mt-3 leading-relaxed">
              We do not sell, trade, or otherwise transfer your personal information to third
              parties without your consent, except as described in this policy or as required by
              law. We may share information with service providers who assist us in operating our
              platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">4. Data Security</h2>
            <p className="mt-3 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your
              personal information against unauthorized access, alteration, disclosure, or
              destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">5. Your Rights</h2>
            <p className="mt-3 leading-relaxed">
              You have the right to access, correct, or delete your personal information. You may
              also opt out of receiving promotional communications from us at any time by following
              the unsubscribe instructions in those messages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">6. Cookies</h2>
            <p className="mt-3 leading-relaxed">
              We use cookies and similar technologies to collect information about your browsing
              activities and to provide you with a better experience on our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">7. Changes to This Policy</h2>
            <p className="mt-3 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any changes
              by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">8. Contact Us</h2>
            <p className="mt-3 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at
              privacy@trafficmena.com.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;
