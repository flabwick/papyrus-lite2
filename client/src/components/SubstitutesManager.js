import React, { useState } from 'react';

const SubstitutesManager = ({ substitutes, onSave, onClose }) => {
  const [localSubstitutes, setLocalSubstitutes] = useState({ ...substitutes });
  const [newSubstituteName, setNewSubstituteName] = useState('');
  const [editingSubstitute, setEditingSubstitute] = useState(null);
  const [error, setError] = useState('');

  const handleAddSubstitute = () => {
    const trimmedName = newSubstituteName.trim();
    
    if (!trimmedName) {
      setError('Substitute name cannot be empty');
      return;
    }

    if (localSubstitutes[trimmedName]) {
      setError(`Substitute "${trimmedName}" already exists`);
      return;
    }

    setLocalSubstitutes({
      ...localSubstitutes,
      [trimmedName]: ''
    });
    setEditingSubstitute(trimmedName);
    setNewSubstituteName('');
    setError('');
  };

  const handleDeleteSubstitute = (name) => {
    const updated = { ...localSubstitutes };
    delete updated[name];
    setLocalSubstitutes(updated);
    if (editingSubstitute === name) {
      setEditingSubstitute(null);
    }
  };

  const handleUpdateSubstitute = (name, content) => {
    setLocalSubstitutes({
      ...localSubstitutes,
      [name]: content
    });
  };

  const handleSave = async () => {
    const success = await onSave(localSubstitutes);
    if (success) {
      onClose();
    } else {
      setError('Failed to save substitutes');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Manage Substitutes</h2>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* Add New Substitute */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Add New Substitute</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newSubstituteName}
            onChange={(e) => setNewSubstituteName(e.target.value)}
            placeholder="Enter substitute name..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleAddSubstitute()}
          />
          <button
            onClick={handleAddSubstitute}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Substitutes List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Substitute Names */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Substitutes ({Object.keys(localSubstitutes).length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {Object.keys(localSubstitutes).map(name => (
              <div
                key={name}
                className={`p-3 rounded border cursor-pointer transition-colors ${
                  editingSubstitute === name
                    ? 'bg-blue-900 border-blue-700'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                }`}
                onClick={() => setEditingSubstitute(name)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono">{name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSubstitute(name);
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm text-gray-400 mt-1 truncate">
                  {localSubstitutes[name] || '(empty)'}
                </div>
              </div>
            ))}
            {Object.keys(localSubstitutes).length === 0 && (
              <div className="text-gray-500 text-center py-8">
                No substitutes yet. Add one above.
              </div>
            )}
          </div>
        </div>

        {/* Substitute Editor */}
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {editingSubstitute ? `Edit: ${editingSubstitute}` : 'Select a substitute to edit'}
          </h3>
          {editingSubstitute && (
            <div>
              <textarea
                value={localSubstitutes[editingSubstitute] || ''}
                onChange={(e) => handleUpdateSubstitute(editingSubstitute, e.target.value)}
                placeholder="Enter substitute content... Can include other-substitutes or file paths"
                className="w-full h-80 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm resize-none"
              />
              <div className="mt-2 text-sm text-gray-400">
                Can contain file paths (e.g., {`{{path/to/file.md}}`}) or other substitutes (e.g., {`{{other-substitute}}`}).
                Supports recursive substitution.
              </div>
            </div>
          )}
        </div>
      </div>

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

export default SubstitutesManager;
