import React, { useState, useEffect } from 'react';
import { Play, Save, Download, Plus, X, Database, Settings } from 'lucide-react';
import { QueryRequest, ReportTemplate, TableInfo, Filter, QueryResponse } from '../types';
import { queryService, templateService, tableService } from '../services/api';
import toast from 'react-hot-toast';
import TableSelector from './TableSelector';
import FilterBuilder from './FilterBuilder';

interface QueryBuilderProps {
  templates: ReportTemplate[];
  onResults: (results: QueryResponse) => void;
  onLoading: (loading: boolean) => void;
}

const QueryBuilder: React.FC<QueryBuilderProps> = ({
  templates,
  onResults,
  onLoading,
}) => {
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [customSQL, setCustomSQL] = useState('');
  const [useCustomSQL, setUseCustomSQL] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadTemplate = (template: ReportTemplate) => {
    setCustomSQL(template.sql);
    setUseCustomSQL(true);
    if (template.columns) {
      setSelectedColumns(template.columns);
    }
    if (template.filters) {
      setFilters(template.filters);
    }
    toast.success(`Loaded template: ${template.name}`);
  };

  const executeQuery = async () => {
    if (!useCustomSQL && selectedColumns.length === 0) {
      toast.error('Please select at least one column');
      return;
    }

    const request: QueryRequest = {
      columns: selectedColumns,
      filters,
      sql: useCustomSQL ? customSQL : undefined,
      page,
      pageSize,
      sortBy: sortBy || undefined,
      sortOrder,
      tableName: selectedTable?.name,
    };

    onLoading(true);
    try {
      const response = await queryService.executeQuery(request);
      onResults(response);
      toast.success('Query executed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to execute query');
    } finally {
      onLoading(false);
    }
  };

  const exportResults = async () => {
    const request: QueryRequest = {
      columns: selectedColumns,
      filters,
      sql: useCustomSQL ? customSQL : undefined,
      tableName: selectedTable?.name,
    };

    try {
      const blob = await queryService.exportToCSV(request);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Export completed!');
    } catch (error: any) {
      toast.error('Failed to export results');
    }
  };

  const saveAsTemplate = async () => {
    if (!customSQL.trim() && selectedColumns.length === 0) {
      toast.error('Please select columns or enter SQL query to save as template');
      return;
    }

    const name = prompt('Enter template name:');
    if (!name) return;

    try {
      await templateService.saveTemplate({
        name,
        sql: customSQL || `SELECT ${selectedColumns.join(', ')} FROM ${selectedTable?.name}`,
        columns: selectedColumns,
        filters,
      });
      toast.success('Template saved successfully!');
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      {templates.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Saved Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 cursor-pointer transition-colors"
                onClick={() => loadTemplate(template)}
              >
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-500 mt-1 truncate">
                  {template.sql.substring(0, 50)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Selector */}
      <TableSelector
        onTableSelect={setSelectedTable}
        onColumnsSelect={setSelectedColumns}
        selectedTable={selectedTable || undefined}
        selectedColumns={selectedColumns}
      />

      {/* Query Builder */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Query Builder</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setUseCustomSQL(!useCustomSQL)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                useCustomSQL
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {useCustomSQL ? 'Custom SQL' : 'Builder Mode'}
            </button>
          </div>
        </div>

        {useCustomSQL ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SQL Query
              </label>
              <textarea
                value={customSQL}
                onChange={(e) => setCustomSQL(e.target.value)}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="SELECT * FROM your_table WHERE..."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <FilterBuilder
              filters={filters}
              onFiltersChange={setFilters}
              availableColumns={selectedTable?.columns || []}
            />

            {/* Pagination and Sorting */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Size
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">No sorting</option>
                  {selectedColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page
                </label>
                <input
                  type="number"
                  min="1"
                  value={page}
                  onChange={(e) => setPage(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-4 pt-6 border-t border-gray-200">
          <button
            onClick={executeQuery}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <Play className="h-4 w-4" />
            <span>Execute Query</span>
          </button>
          <button
            onClick={exportResults}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          {(useCustomSQL || selectedColumns.length > 0) && (
            <button
              onClick={saveAsTemplate}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Template</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueryBuilder; 