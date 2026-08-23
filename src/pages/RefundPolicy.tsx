import { Link } from 'react-router-dom';
import Layout from '@/shared/components/layout/Layout';

const RefundPolicy = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-bold text-neutral-900">Refund Policy</h1>
        <p className="mt-4 text-sm text-neutral-500">Last updated: July 2026</p>

        <div className="mt-8 rounded-2xl border border-[#05ef62]/50 bg-[#d5ffe9]/50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-900">Our 7-day guarantee</h2>
          <p className="mt-3 leading-relaxed text-neutral-700">
            Request a cancellation at least 7 days before the event start date and receive a full
            refund, no questions asked.
          </p>
        </div>

        <div className="mt-8 space-y-8 text-neutral-700">
          <section>
            <h2 className="text-xl font-semibold text-neutral-900">1. Event registrations</h2>
            <p className="mt-3 leading-relaxed">
              For an individual event registration, the guarantee window is measured from that
              event&apos;s scheduled start date. Submit your request through the in-app cancellation
              option. Requests within the guarantee window are approved unconditionally.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">2. Track bookings</h2>
            <p className="mt-3 leading-relaxed">
              The same full-refund guarantee applies to a track booking when you request a refund at
              least 7 days before the track&apos;s first event. Track refunds do not have a
              self-service cancellation option, so please contact us by email or WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              3. Event-specific refund terms
            </h2>
            <p className="mt-3 leading-relaxed">
              Refund terms shown on a specific event take precedence over this general policy. If an
              event does not state separate refund terms, this policy applies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">4. How to request a refund</h2>
            <p className="mt-3 leading-relaxed">
              Use the in-app cancellation option for individual event registrations. For track
              bookings and all other refund requests, visit our{' '}
              <Link className="font-medium text-[#006681] underline" to="/contact">
                Contact Us page
              </Link>{' '}
              to reach us by email or WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              5. Requests made under 7 days
            </h2>
            <p className="mt-3 leading-relaxed">
              Requests made fewer than 7 days before the relevant event start date fall outside the
              guarantee. They are handled according to the event-specific terms, when present, or
              reviewed case by case.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">6. Subscriptions</h2>
            <p className="mt-3 leading-relaxed">
              You may cancel your subscription at any time. Your access continues through the end of
              your current subscription period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">7. Questions</h2>
            <p className="mt-3 leading-relaxed">
              If you have questions about this policy or need help with a request, please use our{' '}
              <Link className="font-medium text-[#006681] underline" to="/contact">
                Contact Us page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default RefundPolicy;
