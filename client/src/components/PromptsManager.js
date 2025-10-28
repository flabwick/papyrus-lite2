import React, { useState, useEffect } from 'react';
import config from '../config';

const PromptsManager = ({ prompts, onSave, onClose, reservedCommands, currentPromptSheet }) => {
  const [localPrompts, setLocalPrompts] = useState({ ...prompts });
  const [newPromptName, setNewPromptName] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [error, setError] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(currentPromptSheet || null);
  const [loading, setLoading] = useState(false);

  const handleAddPrompt = () => {
    const trimmedName = newPromptName.trim();
    
    if (!trimmedName) {
      setError('Prompt name cannot be empty');
      return;
    }

    if (reservedCommands.includes(trimmedName)) {
      setError(`Cannot use reserved command name: ${trimmedName}`);
      return;
    }

    if (localPrompts[trimmedName]) {
      setError(`Prompt "${trimmedName}" already exists`);
      return;
    }

    setLocalPrompts({
      ...localPrompts,
      [trimmedName]: ''
    });
    setEditingPrompt(trimmedName);
    setNewPromptName('');
    setError('');
  };

  const handleDeletePrompt = (name) => {
    const updated = { ...localPrompts };
    delete updated[name];
    setLocalPrompts(updated);
    if (editingPrompt === name) {
      setEditingPrompt(null);
    }
  };

  const handleUpdatePrompt = (name, content) => {
    setLocalPrompts({
      ...localPrompts,
      [name]: content
    });
  };

  useEffect(() => {
    loadAvailableSheets();
  }, []);

  useEffect(() => {
    if (selectedSheet !== currentPromptSheet) {
      loadSheetPrompts(selectedSheet);
    }
  }, [selectedSheet]);

  const loadAvailableSheets = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/prompt-sheets`);
      if (response.ok) {
        const sheets = await response.json();
        setAvailableSheets(sheets);
      }
    } catch (error) {
      console.error('Error loading sheets:', error);
    }
  };

  const loadSheetPrompts = async (sheetName) => {
    if (!sheetName) {
      // Load default prompts
      setLocalPrompts({ ...prompts });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/api/prompt-sheets/${sheetName}`);
      if (response.ok) {
        const sheetData = await response.json();
        setLocalPrompts({ ...sheetData.prompts });
      } else {
        setError(`Failed to load sheet: ${sheetName}`);
      }
    } catch (error) {
      setError(`Error loading sheet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Always use the parent's onSave function which now handles both default and sheet saves
    const success = await onSave(localPrompts);
    if (success) {
      onClose();
    } else {
      setError('Failed to save prompts');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">
        Manage Prompts
        {selectedSheet && (
          <span className="text-blue-400 font-mono ml-2">[{selectedSheet}]</span>
        )}
      </h2>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* Sheet Selection */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Prompt Sheet</h3>
        <div className="flex space-x-2">
          <select
            value={selectedSheet || ''}
            onChange={(e) => setSelectedSheet(e.target.value || null)}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            disabled={loading}
          >
            <option value="">Default Prompts (prompts.json)</option>
            {availableSheets.map(sheet => (
              <option key={sheet.name} value={sheet.name}>
                {sheet.name} ({sheet.promptCount} prompts)
                {sheet.description && ` - ${sheet.description}`}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          {selectedSheet 
            ? `Editing prompts in sheet: ${selectedSheet}` 
            : 'Editing default prompts file'
          }
        </p>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="text-gray-400">Loading prompts...</div>
        </div>
      )}

      {/* Add New Prompt */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Add New Prompt</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newPromptName}
            onChange={(e) => setNewPromptName(e.target.value)}
            placeholder="Enter prompt name..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPrompt()}
          />
          <button
            onClick={handleAddPrompt}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Add
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Reserved commands: {reservedCommands.join(', ')}
        </p>
      </div>

      {/* Prompts List */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Prompt Names */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Prompts ({Object.keys(localPrompts).length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {Object.keys(localPrompts).map(name => (
              <div
                key={name}
                className={`p-3 rounded border cursor-pointer transition-colors ${
                  editingPrompt === name
                    ? 'bg-blue-900 border-blue-700'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                }`}
                onClick={() => setEditingPrompt(name)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono">//{name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePrompt(name);
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm text-gray-400 mt-1 truncate">
                  {localPrompts[name] || '(empty)'}
                </div>
              </div>
            ))}
            {Object.keys(localPrompts).length === 0 && (
              <div className="text-gray-500 text-center py-8">
                No prompts yet. Add one above.
              </div>
            )}
          </div>
        </div>

        {/* Prompt Editor */}
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {editingPrompt ? `Edit: //${editingPrompt}` : 'Select a prompt to edit'}
          </h3>
          {editingPrompt && (
            <div>
              <textarea
                value={localPrompts[editingPrompt] || ''}
                onChange={(e) => handleUpdatePrompt(editingPrompt, e.target.value)}
                placeholder="Enter prompt content... Use link-name for substitutions"
                className="w-full h-80 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm resize-none"
              />
              <div className="mt-2 text-sm text-gray-400">
                Use {`{{link-name}}`} for substitutions. Links can be file paths or substitute names.
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-700">
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

export default PromptsManager;
