export interface ReportTemplate {
  id?: number;
  name: string;
  sql: string;
  columns?: string[];
  filters?: Filter[];
  created_at?: string;
  updated_at?: string;
}

export interface Filter {
  field: string;
  operator: string;
  value: any;
  type: 'text' | 'number' | 'date' | 'enum';
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface QueryRequest {
  columns: string[];
  filters: Filter[];
  sql?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  tableName?: string;
}

export interface QueryResponse {
  data: Record<string, any>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export type FilterOperator = '=' | '>' | '<' | '>=' | '<=' | '!=' | 'LIKE' | 'IN' | 'BETWEEN';

export interface FilterConfig {
  field: string;
  operator: FilterOperator;
  value: any;
  type: 'text' | 'number' | 'date' | 'enum';
  label?: string;
} 