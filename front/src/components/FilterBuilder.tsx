import React, { useState } from 'react';
import { Plus, X, Filter } from 'lucide-react';
import { Filter as FilterType, FilterOperator } from '../types';

interface FilterBuilderProps {
  filters: FilterType[];
  onFiltersChange: (filters: FilterType[]) => void;
  availableColumns: { name: string; type: string }[];
}

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  filters,
  onFiltersChange,
  availableColumns,
}) => {
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<FilterType>>({
    operator: '=',
    type: 'text',
  });

  const operators: { value: FilterOperator; label: string; types: string[] }[] = [
    { value: '=', label: 'Equals', types: ['text', 'number', 'date', 'enum'] },
    { value: '!=', label: 'Not Equals', types: ['text', 'number', 'date', 'enum'] },
    { value: '>', label: 'Greater Than', types: ['number', 'date'] },
    { value: '<', label: 'Less Than', types: ['number', 'date'] },
    { value: '>=', label: 'Greater or Equal', types: ['number', 'date'] },
    { value: '<=', label: 'Less or Equal', types: ['number', 'date'] },
    { value: 'LIKE', label: 'Contains', types: ['text'] },
    { value: 'IN', label: 'In List', types: ['text', 'number', 'enum'] },
    { value: 'BETWEEN', label: 'Between', types: ['number', 'date'] },
  ];

  const addFilter = () => {
    if (!newFilter.field || !newFilter.operator || newFilter.value === undefined) {
      return;
    }

    const filter: FilterType = {
      field: newFilter.field,
      operator: newFilter.operator,
      value: newFilter.value,
      type: newFilter.type || 'text',
    };

    onFiltersChange([...filters, filter]);
    setNewFilter({ operator: '=', type: 'text' });
    setShowAddFilter(false);
  };

  const removeFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    onFiltersChange(newFilters);
  };

  const updateFilter = (index: number, field: keyof FilterType, value: any) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    onFiltersChange(newFilters);
  };

  const getOperatorsForType = (type: string) => {
    return operators.filter(op => op.types.includes(type));
  };

  const renderValueInput = (filter: FilterType, index: number) => {
    switch (filter.type) {
      case 'date':
        return (
          <input
            type="date"
            value={filter.value as string}
            onChange={(e) => updateFilter(index, 'value', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={filter.value as number}
            onChange={(e) => updateFilter(index, 'value', parseFloat(e.target.value) || 0)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        );
      case 'enum':
        return (
          <input
            type="text"
            value={filter.value as string}
            onChange={(e) => updateFilter(index, 'value', e.target.value)}
            placeholder="Enter values separated by commas"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        );
      default:
        return (
          <input
            type="text"
            value={filter.value as string}
            onChange={(e) => updateFilter(index, 'value', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <button
          onClick={() => setShowAddFilter(!showAddFilter)}
          className="flex items-center space-x-2 px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Filter</span>
        </button>
      </div>

      {/* Existing Filters */}
      <div className="space-y-3 mb-4">
        {filters.map((filter, index) => (
          <div key={index} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg">
            <select
              value={filter.field}
              onChange={(e) => updateFilter(index, 'field', e.target.value)}
              className="w-1/4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Field</option>
              {availableColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>

            <select
              value={filter.operator}
              onChange={(e) => updateFilter(index, 'operator', e.target.value)}
              className="w-1/6 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {getOperatorsForType(filter.type).map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>

            {renderValueInput(filter, index)}

            <select
              value={filter.type}
              onChange={(e) => updateFilter(index, 'type', e.target.value)}
              className="w-1/6 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="enum">Enum</option>
            </select>

            <button
              onClick={() => removeFilter(index)}
              className="p-2 text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Filter */}
      {showAddFilter && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center space-x-2">
            <select
              value={newFilter.field || ''}
              onChange={(e) => setNewFilter({ ...newFilter, field: e.target.value })}
              className="w-1/4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Field</option>
              {availableColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>

            <select
              value={newFilter.operator || '='}
              onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value as FilterOperator })}
              className="w-1/6 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {getOperatorsForType(newFilter.type || 'text').map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={newFilter.value || ''}
              onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
              placeholder="Enter value"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />

            <select
              value={newFilter.type || 'text'}
              onChange={(e) => setNewFilter({ ...newFilter, type: e.target.value as any })}
              className="w-1/6 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="enum">Enum</option>
            </select>

            <button
              onClick={addFilter}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Add
            </button>

            <button
              onClick={() => setShowAddFilter(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {filters.length === 0 && !showAddFilter && (
        <div className="text-center py-8 text-gray-500">
          <Filter className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No filters added yet</p>
          <p className="text-sm">Click "Add Filter" to start filtering your data</p>
        </div>
      )}
    </div>
  );
};

export default FilterBuilder; 