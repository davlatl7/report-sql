import axios from 'axios';
import { QueryRequest, QueryResponse, ReportTemplate, TableInfo, ColumnInfo } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const tableService = {
  getTables: async (): Promise<TableInfo[]> => {
    const response = await api.get<TableInfo[]>('/tables');
    return response.data;
  },

  getTableColumns: async (tableName: string): Promise<ColumnInfo[]> => {
    const response = await api.get<ColumnInfo[]>(`/tables/${tableName}/columns`);
    return response.data;
  },
};

export const queryService = {
  executeQuery: async (request: QueryRequest): Promise<QueryResponse> => {
    const response = await api.post<QueryResponse>('/query', request);
    return response.data;
  },

  exportToCSV: async (request: QueryRequest): Promise<Blob> => {
    const response = await api.post('/export', request, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const templateService = {
  getTemplates: async (): Promise<ReportTemplate[]> => {
    const response = await api.get<ReportTemplate[]>('/templates');
    return response.data;
  },

  saveTemplate: async (template: ReportTemplate): Promise<ReportTemplate> => {
    const response = await api.post<ReportTemplate>('/templates', template);
    return response.data;
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },
}; 