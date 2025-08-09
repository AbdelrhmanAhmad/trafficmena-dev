
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  imageUrl: string;
  title: string;
  description: string;
  price: string;
  ctaLabel?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  imageUrl, 
  title, 
  description, 
  price, 
  ctaLabel = "Buy Now" 
}) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="aspect-video overflow-hidden">
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-primary line-clamp-2">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 text-sm line-clamp-3">
          {description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">{price}</span>
          <Button className="bg-primary-green hover:bg-primary-green/90">
            {ctaLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
