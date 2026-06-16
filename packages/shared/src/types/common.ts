export type ISODateString = string;
export type UUID = string;
export type StellarAddress = string;

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
  details?: unknown;
  requestId?: string;
  timestamp: ISODateString;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  };
}

export interface ApiResponse<T> {
  data: T;
  requestId?: string;
}
