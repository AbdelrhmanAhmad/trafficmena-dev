import Layout from '@/shared/components/layout/Layout';

const TermsOfService = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-bold text-neutral-900">Terms of Service</h1>
        <p className="mt-4 text-sm text-neutral-500">Last updated: January 2025</p>

        <div className="mt-8 space-y-8 text-neutral-700">
          <section>
            <h2 className="text-xl font-semibold text-neutral-900">1. Acceptance of Terms</h2>
            <p className="mt-3 leading-relaxed">
              By accessing and using TrafficMENA, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">2. Use of Service</h2>
            <p className="mt-3 leading-relaxed">
              You agree to use our services only for lawful purposes and in accordance with these
              terms. You are responsible for maintaining the confidentiality of your account
              credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">3. User Content</h2>
            <p className="mt-3 leading-relaxed">
              You retain ownership of any content you submit to our platform. By submitting content,
              you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, and
              display your content in connection with our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">4. Event Registration</h2>
            <p className="mt-3 leading-relaxed">
              When you register for events through our platform, you agree to provide accurate
              information and to comply with any event-specific terms and conditions. Event
              cancellation and refund policies are determined by the event organizers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">5. Intellectual Property</h2>
            <p className="mt-3 leading-relaxed">
              All content, features, and functionality of our platform are owned by TrafficMENA and
              are protected by international copyright, trademark, and other intellectual property
              laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">6. Limitation of Liability</h2>
            <p className="mt-3 leading-relaxed">
              TrafficMENA shall not be liable for any indirect, incidental, special, consequential,
              or punitive damages arising out of or related to your use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">7. Termination</h2>
            <p className="mt-3 leading-relaxed">
              We reserve the right to terminate or suspend your account at any time for violations
              of these terms or for any other reason at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">8. Changes to Terms</h2>
            <p className="mt-3 leading-relaxed">
              We may modify these terms at any time. Your continued use of our services after any
              changes constitutes your acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">9. Governing Law</h2>
            <p className="mt-3 leading-relaxed">
              These terms shall be governed by and construed in accordance with the laws of the
              United Arab Emirates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">10. Contact Us</h2>
            <p className="mt-3 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at
              legal@trafficmena.com.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default TermsOfService;
