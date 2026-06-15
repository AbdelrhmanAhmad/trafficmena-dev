import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { trackCalculatorUsed } from '@/lib/analytics/events';
import {
  shouldTrackCalculatorPointerInteraction,
  shouldTrackCalculatorUsage,
} from './analytics-shared';

type CalculatorAnalyticsContextValue = {
  reportResultReady: (isReady: boolean) => void;
};

type CalculatorAnalyticsProviderProps = {
  calculatorId: string;
  calculatorName: string;
  calculatorCategory: string;
  children: ReactNode;
};

type CalculatorInteractionTarget = EventTarget | null;

const CalculatorAnalyticsContext = createContext<CalculatorAnalyticsContextValue | null>(null);

function isCalculatorPointerInteraction(target: CalculatorInteractionTarget): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactiveElement = target.closest(
    ['[role="slider"]', '[role="radio"]', '[role="option"]', '[data-radix-collection-item]'].join(
      ',',
    ),
  );
  if (!interactiveElement) {
    return false;
  }

  return shouldTrackCalculatorPointerInteraction({
    role: interactiveElement.getAttribute('role'),
    isRadixCollectionItem: interactiveElement.hasAttribute('data-radix-collection-item'),
  });
}

export function CalculatorAnalyticsProvider({
  calculatorId,
  calculatorName,
  calculatorCategory,
  children,
}: CalculatorAnalyticsProviderProps) {
  const hasInteractedRef = useRef(false);
  const hasTrackedRef = useRef(false);
  const hasValidResultRef = useRef(false);

  const maybeTrackCalculatorUsage = useCallback(() => {
    if (
      !shouldTrackCalculatorUsage({
        hasInteracted: hasInteractedRef.current,
        hasValidResult: hasValidResultRef.current,
        alreadyTracked: hasTrackedRef.current,
      })
    ) {
      return;
    }

    hasTrackedRef.current = true;
    trackCalculatorUsed({
      calculatorId,
      calculatorName,
      calculatorCategory,
    });
  }, [calculatorCategory, calculatorId, calculatorName]);

  const markInteraction = useCallback(() => {
    if (!hasInteractedRef.current) {
      hasInteractedRef.current = true;
    }

    maybeTrackCalculatorUsage();
  }, [maybeTrackCalculatorUsage]);

  const reportResultReady = useCallback(
    (isReady: boolean) => {
      hasValidResultRef.current = isReady;
      maybeTrackCalculatorUsage();
    },
    [maybeTrackCalculatorUsage],
  );

  const contextValue = useMemo(
    () => ({
      reportResultReady,
    }),
    [reportResultReady],
  );

  const handleInputCapture = useCallback(() => {
    markInteraction();
  }, [markInteraction]);

  const handleClickCapture = useCallback(
    (event: { target: EventTarget | null }) => {
      if (isCalculatorPointerInteraction(event.target)) {
        markInteraction();
      }
    },
    [markInteraction],
  );

  const handlePointerUpCapture = useCallback(
    (event: { target: EventTarget | null }) => {
      if (isCalculatorPointerInteraction(event.target)) {
        markInteraction();
      }
    },
    [markInteraction],
  );

  return (
    <CalculatorAnalyticsContext.Provider value={contextValue}>
      <div
        onChangeCapture={handleInputCapture}
        onClickCapture={handleClickCapture}
        onInputCapture={handleInputCapture}
        onPointerUpCapture={handlePointerUpCapture}
      >
        {children}
      </div>
    </CalculatorAnalyticsContext.Provider>
  );
}

export function useReportCalculatorResultReady(isReady: boolean): void {
  const context = useContext(CalculatorAnalyticsContext);

  useEffect(() => {
    context?.reportResultReady(isReady);
  }, [context, isReady]);
}
