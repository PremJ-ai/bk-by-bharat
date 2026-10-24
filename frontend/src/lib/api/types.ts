export interface AdminUserDTO {
  id: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface ApiPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  pagination?: ApiPagination;
  meta?: {
    requestId?: string;
    csrfToken?: string;
    message?: string;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  };
}
