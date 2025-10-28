import React, { useState, useEffect } from 'react';
import config from '../config';

const PromptSheetDeleter = ({ onClose, onSuccess }) => {
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    loadAvailableSheets();
  }, []);

  const loadAvailableSheets = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/prompt-sheets`);
      if (response.ok) {
        const sheets = await response.json();
        setAvailableSheets(sheets);
      } else {
        setError('Failed to load prompt sheets');
      }
    } catch (err) {
      setError('Network error: Failed to load prompt sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSheet) {
      setError('Please select a sheet to delete');
      return;
    }

    if (confirmText !== selectedSheet) {
      setError(`Please type "${selectedSheet}" to confirm deletion`);
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const response = await fetch(`${config.apiUrl}/api/prompt-sheets/${selectedSheet}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onSuccess && onSuccess(selectedSheet);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete prompt sheet');
      }
    } catch (err) {
      setError('Network error: Failed to delete prompt sheet');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Delete Prompt Sheet</h2>
        <div className="text-center py-8">
          <div className="text-gray-400">Loading prompt sheets...</div>
        </div>
      </div>
    );
  }

  if (availableSheets.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Delete Prompt Sheet</h2>
        <div className="text-center py-8">
          <div className="text-gray-400">No prompt sheets available to delete.</div>
        </div>
        <div className="flex justify-end mt-6">
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

  const selectedSheetData = availableSheets.find(s => s.name === selectedSheet);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Delete Prompt Sheet</h2>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Sheet Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Select Sheet to Delete
          </label>
          <select
            value={selectedSheet}
            onChange={(e) => {
              setSelectedSheet(e.target.value);
              setConfirmText('');
              setError('');
            }}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            disabled={deleting}
          >
            <option value="">-- Select a prompt sheet --</option>
            {availableSheets.map(sheet => (
              <option key={sheet.name} value={sheet.name}>
                {sheet.name} ({sheet.promptCount} prompts)
              </option>
            ))}
          </select>
        </div>

        {/* Sheet Info */}
        {selectedSheetData && (
          <div className="p-3 bg-red-900/20 border border-red-700 rounded">
            <div className="font-mono text-red-400 mb-1">{selectedSheetData.name}</div>
            <div className="text-sm text-gray-300">
              {selectedSheetData.promptCount} prompts
              {selectedSheetData.description && ` • ${selectedSheetData.description}`}
            </div>
            <div className="text-sm text-red-300 mt-2">
              ⚠️ This action cannot be undone. All prompts in this sheet will be permanently deleted.
            </div>
          </div>
        )}

        {/* Confirmation */}
        {selectedSheet && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Type <span className="font-mono text-red-400">{selectedSheet}</span> to confirm deletion
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type "${selectedSheet}" here`}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              disabled={deleting}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
          disabled={deleting}
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
          disabled={deleting || !selectedSheet || confirmText !== selectedSheet}
        >
          {deleting ? 'Deleting...' : 'Delete Sheet'}
        </button>
      </div>
    </div>
  );
};

export default PromptSheetDeleter;
