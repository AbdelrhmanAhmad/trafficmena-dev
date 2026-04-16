import type { CalculatorCategory } from './types';

export const ANALYTICS_CATEGORY_MAP: Record<CalculatorCategory, string> = {
  traffic: 'traffic_acquisition',
  conversion: 'conversion',
  revenue: 'revenue_value',
  retention: 'retention_growth',
  efficiency: 'efficiency',
};

type ResolveCalculatorResultReadyInput = {
  resultReady?: boolean;
  shareDisabled?: boolean;
  hasExplicitShareDisabled: boolean;
};

type CalculatorPointerInteractionInput = {
  role?: string | null;
  isRadixCollectionItem?: boolean;
};

export function resolveCalculatorResultReady(input: ResolveCalculatorResultReadyInput): boolean {
  if (typeof input.resultReady === 'boolean') {
    return input.resultReady;
  }

  if (input.hasExplicitShareDisabled) {
    return input.shareDisabled === false;
  }

  return false;
}

export function shouldTrackCalculatorPointerInteraction(
  input: CalculatorPointerInteractionInput,
): boolean {
  return (
    input.role === 'slider' ||
    input.role === 'option' ||
    input.role === 'radio' ||
    Boolean(input.isRadixCollectionItem)
  );
}

export function shouldTrackCalculatorUsage(input: {
  hasInteracted: boolean;
  hasValidResult: boolean;
  alreadyTracked: boolean;
}): boolean {
  return input.hasInteracted && input.hasValidResult && !input.alreadyTracked;
}
