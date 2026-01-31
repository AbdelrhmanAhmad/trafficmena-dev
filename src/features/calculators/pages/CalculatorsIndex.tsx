import {
  Calculator,
  DollarSign,
  Gauge,
  MousePointerClick,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Card } from '@/shared/components/ui/card';
import { CALCULATOR_CATEGORIES, CALCULATORS, type CalculatorCategory } from '../types';

const categoryIcons: Record<CalculatorCategory, typeof Calculator> = {
  traffic: MousePointerClick,
  conversion: RefreshCw,
  revenue: DollarSign,
  retention: TrendingUp,
  efficiency: Gauge,
};

const categoryColors: Record<CalculatorCategory, string> = {
  traffic: 'bg-blue-100 text-blue-700',
  conversion: 'bg-purple-100 text-purple-700',
  revenue: 'bg-green-100 text-green-700',
  retention: 'bg-amber-100 text-amber-700',
  efficiency: 'bg-pink-100 text-pink-700',
};

const CalculatorsIndex = () => {
  const categories = Object.keys(CALCULATOR_CATEGORIES) as CalculatorCategory[];

  return (
    <AppLayout variant="member">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Marketing Calculators</h1>
          <p className="mt-1 text-neutral-600">
            23 essential calculators to measure and optimize your marketing performance
          </p>
        </div>

        {categories.map((category) => {
          const calculators = CALCULATORS.filter((c) => c.category === category);
          const Icon = categoryIcons[category];

          return (
            <section key={category}>
              <div className="mb-4 flex items-center gap-2">
                <Icon className="h-5 w-5 text-neutral-700" />
                <h2 className="text-lg font-semibold text-neutral-900">
                  {CALCULATOR_CATEGORIES[category]}
                </h2>
                <span className="text-sm text-neutral-500">({calculators.length})</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {calculators.map((calc) => (
                  <Link key={calc.slug} to={`/dashboard/calculators/${calc.slug}`}>
                    <Card className="h-full p-4 transition-all hover:border-neutral-300 hover:shadow-md">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 rounded-lg bg-neutral-100 p-2">
                          <Calculator className="h-5 w-5 text-neutral-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-neutral-900">{calc.title}</h3>
                          <p className="mt-0.5 text-sm text-neutral-500">{calc.description}</p>
                          <span
                            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[category]}`}
                          >
                            {CALCULATOR_CATEGORIES[category]}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default CalculatorsIndex;
