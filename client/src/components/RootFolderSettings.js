import React, { useState } from 'react';

const RootFolderSettings = ({ settings, onSave, onClose }) => {
  const [rootFolderPath, setRootFolderPath] = useState(
    settings.rootFolderPath || './'
  );
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const validatePath = async (path) => {
    try {
      const response = await fetch('/api/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: '.' }) // Test if we can access the directory
      });
      
      if (!response.ok) {
        return 'Invalid path or access denied';
      }
      return null;
    } catch (error) {
      return 'Failed to validate path';
    }
  };

  const handleSave = async () => {
    const trimmedPath = rootFolderPath.trim();
    
    if (!trimmedPath) {
      setValidationError('Root folder path cannot be empty');
      return;
    }

    // Basic path validation
    if (trimmedPath.includes('..') && !trimmedPath.startsWith('./')) {
      setValidationError('Path traversal detected. Use relative paths starting with ./ for security');
      return;
    }

    const updatedSettings = {
      ...settings,
      rootFolderPath: trimmedPath
    };

    const success = await onSave(updatedSettings);
    if (success) {
      onClose();
    } else {
      setError('Failed to save root folder settings');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Root Folder Settings</h2>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {validationError && (
        <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 px-4 py-2 rounded mb-4">
          {validationError}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Root Folder Path
        </label>
        <input
          type="text"
          value={rootFolderPath}
          onChange={(e) => {
            setRootFolderPath(e.target.value);
            setValidationError('');
          }}
          placeholder="Enter root folder path (e.g., ./documents)"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono"
        />
        <div className="mt-2 text-sm text-gray-400">
          This is the base directory where file links will be resolved from. 
          All {`{{file-path}}`} links in prompts and substitutes will be relative to this folder.
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Path Examples</h3>
        <div className="space-y-2 text-sm text-gray-300 font-mono">
          <p><code>./</code> - Current directory</p>
          <p><code>./documents</code> - Documents subfolder</p>
          <p><code>./projects/my-project</code> - Specific project folder</p>
          <p><code>/Users/username/Documents</code> - Absolute path (use with caution)</p>
        </div>
      </div>

      <div className="mb-4 p-3 bg-blue-900 border border-blue-700 rounded">
        <p className="text-blue-200 text-sm">
          <strong>Security Note:</strong> Only .md and .txt files can be read. 
          The system prevents access to files outside the specified root directory.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default RootFolderSettings;
