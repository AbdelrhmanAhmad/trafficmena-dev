
import React from 'react';
import Layout from '@/components/Layout';
import PricingCard from '@/components/PricingCard';

const Subscribe: React.FC = () => {
  const monthlyFeatures = [
    "Access to all live online meetups",
    "Live Q&A sessions with industry experts",
    "Monthly networking opportunities",
    "Basic email support",
    "Access to event recordings (48-hour limit)"
  ];

  const quarterlyFeatures = [
    "Everything in Monthly plan",
    "Priority seating at events",
    "Access to exclusive quarterly workshops",
    "Direct messaging with speakers",
    "Extended recording access (1 week)",
    "Quarterly industry reports"
  ];

  const yearlyFeatures = [
    "Everything in Quarterly plan",
    "VIP access to all events",
    "One-on-one mentorship session (quarterly)",
    "Early access to new features",
    "Unlimited recording access",
    "Annual TrafficMENA summit invitation",
    "Custom marketing strategy consultation",
    "Premium community forum access"
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Become a TrafficMENA Member
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join our exclusive community of marketing professionals and unlock premium resources, 
              networking opportunities, and expert insights to accelerate your career in the MENA region.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Monthly Plan */}
            <PricingCard
              planName="Monthly"
              price="$29/mo"
              features={monthlyFeatures}
              ctaLabel="Choose Monthly"
            />

            {/* Quarterly Plan - Popular */}
            <PricingCard
              planName="Quarterly"
              price="$79/quarter"
              features={quarterlyFeatures}
              ctaLabel="Choose Quarterly"
              isPopular={true}
            />

            {/* Yearly Plan */}
            <PricingCard
              planName="Yearly"
              price="$299/year"
              features={yearlyFeatures}
              ctaLabel="Choose Yearly"
            />
          </div>

          {/* Additional Information */}
          <div className="text-center mt-12">
            <p className="text-gray-600 text-sm">
              All plans include a 7-day free trial. Cancel anytime.
            </p>
            <p className="text-gray-600 text-sm mt-2">
              Need a custom plan for your organization? 
              <span className="text-primary-green font-medium cursor-pointer hover:underline ml-1">
                Contact us
              </span>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Subscribe;
