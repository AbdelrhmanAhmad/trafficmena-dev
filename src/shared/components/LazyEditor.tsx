import { lazy, Suspense } from 'react';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

type LazyEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
};

const SimpleEditorWrapper = lazy(() =>
  import('@/shared/components/SimpleEditorWrapper').then((module) => ({
    default: module.SimpleEditorWrapper,
  })),
);

export function LazyEditor(props: LazyEditorProps) {
  const errorFallback = (
    <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50/60 p-6 text-sm text-red-600">
      Editor failed to load. Please refresh the page and try again.
    </div>
  );

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense
        fallback={
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white/70 p-6">
            <LoadingSpinner size="sm" text="Loading editor..." />
          </div>
        }
      >
        <SimpleEditorWrapper {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
