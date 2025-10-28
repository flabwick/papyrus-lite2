import React, { useState } from 'react';
import config from '../config';

const PromptSheetCreator = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Sheet name is required');
      return;
    }

    // Validate name format
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (sanitizedName !== name.toLowerCase()) {
      setError('Sheet name can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${config.apiUrl}/api/prompt-sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.toLowerCase(),
          description: description.trim() || null,
          prompts: {}
        })
      });

      if (response.ok) {
        onSuccess && onSuccess(name.toLowerCase());
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create prompt sheet');
      }
    } catch (err) {
      setError('Network error: Failed to create prompt sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Create New Prompt Sheet</h2>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Sheet Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Sheet Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., coding, writing, research"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            disabled={loading}
            autoFocus
          />
          <p className="text-sm text-gray-400 mt-1">
            Only letters, numbers, hyphens, and underscores allowed
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this prompt sheet's purpose"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none"
            rows="3"
            disabled={loading}
          />
        </div>

        {/* Preview */}
        {name && (
          <div className="p-3 bg-gray-800 border border-gray-700 rounded">
            <div className="text-sm text-gray-400 mb-1">Preview:</div>
            <div className="font-mono text-blue-400">
              prompts-{name.toLowerCase().replace(/[^a-z0-9-_]/g, '-')}.json
            </div>
            {description && (
              <div className="text-sm text-gray-300 mt-1">{description}</div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
          disabled={loading || !name.trim()}
        >
          {loading ? 'Creating...' : 'Create Sheet'}
        </button>
      </div>
    </div>
  );
};

export default PromptSheetCreator;
