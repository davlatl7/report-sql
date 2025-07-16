import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Database, FileText, Settings, Download, Play } from 'lucide-react';
import { ReportTemplate, QueryResponse } from './types';
import { templateService } from './services/api';
import QueryBuilder from './components/QueryBuilder';
import TemplateManager from './components/TemplateManager';
import ResultsViewer from './components/ResultsViewer';
import toast from 'react-hot-toast';

type TabType = 'query' | 'templates' | 'results';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('query');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [queryResults, setQueryResults] = useState<QueryResponse>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templateService.getTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error('Failed to load templates');
    }
  };

  const handleQueryResults = (results: QueryResponse) => {
    setQueryResults(results);
    setActiveTab('results');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
                <p className="text-sm text-gray-500">Create and manage SQL reports</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('query')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'query'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Play className="h-4 w-4" />
              <span>Query Builder</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Templates</span>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Download className="h-4 w-4" />
              <span>Results</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'query' && (
          <QueryBuilder
            templates={templates}
            onResults={handleQueryResults}
            onLoading={setIsLoading}
          />
        )}
        {activeTab === 'templates' && (
          <TemplateManager
            templates={templates}
            onTemplatesChange={setTemplates}
          />
        )}
        {activeTab === 'results' && (
          <ResultsViewer results={queryResults} />
        )}
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span className="text-gray-700">Executing query...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 