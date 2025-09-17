import React, { useState } from 'react';

const SystemSettings = ({ settings, onSave, onClose }) => {
  const [systemInstructions, setSystemInstructions] = useState(
    settings.systemInstructions || 'You are a helpful AI assistant.'
  );
  const [error, setError] = useState('');

  const handleSave = async () => {
    const updatedSettings = {
      ...settings,
      systemInstructions: systemInstructions.trim()
    };

    const success = await onSave(updatedSettings);
    if (success) {
      onClose();
    } else {
      setError('Failed to save system settings');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">System Instructions</h2>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          AI System Instructions
        </label>
        <textarea
          value={systemInstructions}
          onChange={(e) => setSystemInstructions(e.target.value)}
          placeholder="Enter system instructions for the AI..."
          className="w-full h-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none"
        />
        <div className="mt-2 text-sm text-gray-400">
          These instructions will be sent to the AI model with every request to define its behavior and personality.
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Example Instructions</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>"You are a helpful AI assistant."</p>
          <p>"You are a technical writing expert. Provide clear, concise explanations."</p>
          <p>"You are a creative writing assistant. Help with storytelling and character development."</p>
          <p>"You are a code reviewer. Focus on best practices, security, and performance."</p>
        </div>
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

export default SystemSettings;
