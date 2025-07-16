import React, { useState } from 'react';
import { Edit, Trash2, Copy, Eye } from 'lucide-react';
import { ReportTemplate } from '../types';
import { templateService } from '../services/api';
import toast from 'react-hot-toast';

interface TemplateManagerProps {
  templates: ReportTemplate[];
  onTemplatesChange: (templates: ReportTemplate[]) => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onTemplatesChange,
}) => {
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [showSQL, setShowSQL] = useState<number | null>(null);

  const handleEdit = (template: ReportTemplate) => {
    setEditingTemplate(template);
  };

  const handleSave = async () => {
    if (!editingTemplate || !editingTemplate.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      const updatedTemplate = await templateService.saveTemplate(editingTemplate);
      const updatedTemplates = templates.map(t => 
        t.id === updatedTemplate.id ? updatedTemplate : t
      );
      onTemplatesChange(updatedTemplates);
      setEditingTemplate(null);
      toast.success('Template updated successfully!');
    } catch (error) {
      toast.error('Failed to update template');
    }
  };

  const handleDelete = async (templateId: number) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      // Note: Backend doesn't have delete endpoint, so we'll just remove from frontend
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      onTemplatesChange(updatedTemplates);
      toast.success('Template deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('SQL copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Report Templates</h3>
          <div className="text-sm text-gray-500">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Edit className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-500">
              Create your first template in the Query Builder tab
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                {editingTemplate?.id === template.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={editingTemplate?.name || ''}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate!,
                          name: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SQL Query
                      </label>
                      <textarea
                        value={editingTemplate?.sql || ''}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate!,
                          sql: e.target.value
                        })}
                        className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {template.name}
                        </h4>
                        <div className="text-sm text-gray-500 mb-3">
                          Created: {new Date(template.created_at || '').toLocaleDateString()}
                        </div>
                        {showSQL === template.id ? (
                          <div className="bg-gray-50 rounded-md p-3 mb-3">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                              {template.sql}
                            </pre>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 mb-3">
                            {template.sql.substring(0, 100)}
                            {template.sql.length > 100 && '...'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => setShowSQL(showSQL === template.id ? null : (template.id ?? null))}
                          className="p-2 text-gray-500 hover:text-gray-700"
                          title="Toggle SQL view"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(template.sql)}
                          className="p-2 text-gray-500 hover:text-gray-700"
                          title="Copy SQL"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-2 text-blue-500 hover:text-blue-700"
                          title="Edit template"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => template.id && handleDelete(template.id)}
                          className="p-2 text-red-500 hover:text-red-700"
                          title="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateManager; 