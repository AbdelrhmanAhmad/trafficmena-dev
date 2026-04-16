import { ArrowLeft } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { CalculatorAnalyticsProvider } from '../analytics';
import { ANALYTICS_CATEGORY_MAP } from '../analytics-shared';
import { getCalculatorBySlug } from '../types';

// SYNC REQUIRED: When adding new calculators, update BOTH:
// 1. CALCULATORS array in '../types/index.ts' (slug, title, description, category, component)
// 2. calculatorComponents map below (lazy import)
const calculatorComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  AOVCalculator: lazy(() => import('../components/AOVCalculator')),
  BreakevenROASCalculator: lazy(() => import('../components/BreakevenROASCalculator')),
  CACCalculator: lazy(() => import('../components/CACCalculator')),
  CACPaybackCalculator: lazy(() => import('../components/CACPaybackCalculator')),
  CPCCalculator: lazy(() => import('../components/CPCCalculator')),
  CPLCalculator: lazy(() => import('../components/CPLCalculator')),
  CPMCalculator: lazy(() => import('../components/CPMCalculator')),
  CTRCalculator: lazy(() => import('../components/CTRCalculator')),
  CVRCalculator: lazy(() => import('../components/CVRCalculator')),
  CartAbandonmentRateCalculator: lazy(() => import('../components/CartAbandonmentRateCalculator')),
  CheckoutAbandonmentRateCalculator: lazy(
    () => import('../components/CheckoutAbandonmentRateCalculator'),
  ),
  GRRCalculator: lazy(() => import('../components/GRRCalculator')),
  LTVCalculator: lazy(() => import('../components/LTVCalculator')),
  LTVCACCalculator: lazy(() => import('../components/LTVCACCalculator')),
  LeadToCustomerRateCalculator: lazy(() => import('../components/LeadToCustomerRateCalculator')),
  MERCalculator: lazy(() => import('../components/MERCalculator')),
  MoMGrowthCalculator: lazy(() => import('../components/MoMGrowthCalculator')),
  NCACCalculator: lazy(() => import('../components/NCACCalculator')),
  NRRCalculator: lazy(() => import('../components/NRRCalculator')),
  ROASCalculator: lazy(() => import('../components/ROASCalculator')),
  RepeatPurchaseRateCalculator: lazy(() => import('../components/RepeatPurchaseRateCalculator')),
  SEOROICalculator: lazy(() => import('../components/SEOROICalculator')),
  SaaSLTVCalculator: lazy(() => import('../components/SaaSLTVCalculator')),
};

const CalculatorDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const calculator = slug ? getCalculatorBySlug(slug) : undefined;

  if (!calculator) {
    return (
      <AppLayout variant="member">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Calculator Not Found</h1>
          <p className="mt-2 text-neutral-600">The calculator you're looking for doesn't exist.</p>
          <Button asChild className="mt-6">
            <Link to="/dashboard/calculators">Back to Calculators</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const CalculatorComponent = calculatorComponents[calculator.component];

  if (!CalculatorComponent) {
    return (
      <AppLayout variant="member">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Calculator Not Available</h1>
          <p className="mt-2 text-neutral-600">This calculator is not yet implemented.</p>
          <Button asChild className="mt-6">
            <Link to="/dashboard/calculators">Back to Calculators</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout variant="member">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/calculators" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              All Calculators
            </Link>
          </Button>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" text={`Loading ${calculator.title}...`} />
            </div>
          }
        >
          <CalculatorAnalyticsProvider
            calculatorId={slug}
            calculatorName={calculator.title}
            calculatorCategory={ANALYTICS_CATEGORY_MAP[calculator.category]}
          >
            <CalculatorComponent />
          </CalculatorAnalyticsProvider>
        </Suspense>
      </div>
    </AppLayout>
  );
};

export default CalculatorDetail;
