export interface PaginatedResult<T> {
  items: T[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export interface HttpExceptionResponse {
  message: string[] | string;
  error: string;
  statusCode: number;
}
