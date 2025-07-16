import React, { useState, useEffect } from 'react';
import { Database, ChevronDown, ChevronRight } from 'lucide-react';
import { TableInfo, ColumnInfo } from '../types';
import { tableService } from '../services/api';
import toast from 'react-hot-toast';

interface TableSelectorProps {
  onTableSelect: (table: TableInfo) => void;
  onColumnsSelect: (columns: string[]) => void;
  selectedTable?: TableInfo;
  selectedColumns: string[];
}

const TableSelector: React.FC<TableSelectorProps> = ({
  onTableSelect,
  onColumnsSelect,
  selectedTable,
  selectedColumns,
}) => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    setLoading(true);
    try {
      const data = await tableService.getTables();
      setTables(data);
    } catch (error) {
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const handleTableSelect = (table: TableInfo) => {
    onTableSelect(table);
    if (!expandedTables.has(table.name)) {
      toggleTableExpansion(table.name);
    }
  };

  const handleColumnToggle = (columnName: string) => {
    const newSelected = selectedColumns.includes(columnName)
      ? selectedColumns.filter(col => col !== columnName)
      : [...selectedColumns, columnName];
    onColumnsSelect(newSelected);
  };

  const selectAllColumns = (table: TableInfo) => {
    const allColumns = table.columns.map(col => col.name);
    onColumnsSelect(allColumns);
  };

  const clearColumns = () => {
    onColumnsSelect([]);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading tables...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Data Source</h3>
        {selectedTable && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => selectAllColumns(selectedTable)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Select All
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={clearColumns}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {tables.map((table) => (
          <div key={table.name} className="border border-gray-200 rounded-lg">
            <div
              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 ${
                selectedTable?.name === table.name ? 'bg-primary-50 border-primary-200' : ''
              }`}
              onClick={() => handleTableSelect(table)}
            >
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">{table.name}</span>
                <span className="text-sm text-gray-500">({table.columns.length} columns)</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTableExpansion(table.name);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                {expandedTables.has(table.name) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>

            {expandedTables.has(table.name) && (
              <div className="border-t border-gray-200 p-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {table.columns.map((column) => (
                    <label
                      key={column.name}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(column.name)}
                        onChange={() => handleColumnToggle(column.name)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {column.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {column.type} {column.nullable ? '(nullable)' : '(not null)'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedTable && selectedColumns.length > 0 && (
        <div className="mt-4 p-3 bg-primary-50 rounded-lg">
          <div className="text-sm font-medium text-primary-900 mb-2">
            Selected Columns ({selectedColumns.length}):
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedColumns.map((column) => (
              <span
                key={column}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
              >
                {column}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableSelector; 