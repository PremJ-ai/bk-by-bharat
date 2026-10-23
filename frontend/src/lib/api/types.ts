export interface AdminUserDTO {
  id: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: {
    requestId?: string;
    csrfToken?: string;
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
