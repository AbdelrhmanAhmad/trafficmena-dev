export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: Pagination;
};
