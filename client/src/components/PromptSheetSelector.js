import React, { useState, useEffect } from 'react';

const PromptSheetSelector = ({ currentSheet, onSelectSheet, onClose }) => {
  const [availableSheets, setAvailableSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAvailableSheets();
  }, []);

  const loadAvailableSheets = async () => {
    try {
      const response = await fetch('/api/prompt-sheets');
      if (response.ok) {
        const sheets = await response.json();
        setAvailableSheets(sheets);
      } else {
        setError('Failed to load prompt sheets');
      }
    } catch (err) {
      setError('Error loading prompt sheets');
      console.error('Error loading prompt sheets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSheet = (sheetName) => {
    onSelectSheet(sheetName);
    onClose();
  };

  const handleClearSelection = () => {
    onSelectSheet(null);
    onClose();
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Select Prompt Sheet</h2>
        <div className="text-center py-8">
          <div className="text-gray-400">Loading prompt sheets...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Select Prompt Sheet</h2>
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Select Prompt Sheet</h2>
      
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">
          Current sheet: {currentSheet ? (
            <span className="text-blue-400 font-mono">{currentSheet}</span>
          ) : (
            <span className="text-red-400">None selected</span>
          )}
        </div>
      </div>

      {/* Clear Selection Option */}
      <div className="mb-4">
        <button
          onClick={handleClearSelection}
          className={`w-full p-3 rounded border text-left transition-colors ${
            !currentSheet
              ? 'bg-red-900 border-red-700 text-red-200'
              : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
          }`}
        >
          <div className="font-mono text-red-400">(No prompt sheet)</div>
          <div className="text-sm text-gray-400 mt-1">
            Use default prompts from main file
          </div>
        </button>
      </div>

      {/* Available Sheets */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {availableSheets.map(sheet => (
          <button
            key={sheet.name}
            onClick={() => handleSelectSheet(sheet.name)}
            className={`w-full p-3 rounded border text-left transition-colors ${
              currentSheet === sheet.name
                ? 'bg-blue-900 border-blue-700 text-blue-200'
                : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
            }`}
          >
            <div className="font-mono">{sheet.name}</div>
            <div className="text-sm text-gray-400 mt-1">
              {sheet.promptCount} prompts
              {sheet.description && ` • ${sheet.description}`}
            </div>
          </button>
        ))}
        {availableSheets.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            No additional prompt sheets found.
            <div className="text-sm mt-2">
              Create prompt sheet files in the data directory to see them here.
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PromptSheetSelector;
