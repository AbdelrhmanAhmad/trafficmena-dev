import { useCallback, useEffect, useState } from 'react';
import type { PaginationState } from '@/types';

interface UsePaginationProps {
  itemsPerPage?: number;
  initialPage?: number;
}

interface UsePaginationReturn extends PaginationState {
  setCurrentPage: (page: number) => void;
  setTotalCount: (count: number) => void;
  resetPagination: () => void;
  getRange: () => { from: number; to: number };
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export const usePagination = ({
  itemsPerPage = 10,
  initialPage = 1,
}: UsePaginationProps = {}): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const resetPagination = useCallback(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  const getRange = useCallback(() => {
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    return { from, to };
  }, [currentPage, itemsPerPage]);

  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return {
    currentPage,
    totalPages,
    totalCount,
    itemsPerPage,
    setCurrentPage,
    setTotalCount,
    resetPagination,
    getRange,
    canGoNext,
    canGoPrevious,
  };
};
