
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface PricingCardProps {
  planName: string;
  price: string;
  features: string[];
  ctaLabel: string;
  isPopular?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ 
  planName, 
  price, 
  features, 
  ctaLabel, 
  isPopular = false 
}) => {
  return (
    <Card className={`relative overflow-hidden ${isPopular ? 'border-primary-green ring-2 ring-primary-green' : ''}`}>
      {isPopular && (
        <div className="absolute top-0 left-0 right-0 bg-primary-green text-white text-center py-2 text-sm font-medium">
          Most Popular
        </div>
      )}
      <CardHeader className={`text-center ${isPopular ? 'pt-12' : 'pt-6'}`}>
        <CardTitle className="text-2xl font-bold text-primary">
          {planName}
        </CardTitle>
        <div className="mt-4">
          <span className="text-4xl font-bold text-primary">{price}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start space-x-3">
              <Check className="h-5 w-5 text-primary-green mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
        <Button 
          className={`w-full ${isPopular ? 'bg-primary-green hover:bg-primary-green/90' : ''}`}
          size="lg"
        >
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PricingCard;
