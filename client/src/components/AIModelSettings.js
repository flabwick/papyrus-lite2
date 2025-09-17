import React, { useState } from 'react';

const AIModelSettings = ({ settings, onSave, onClose }) => {
  const [aiModel, setAiModel] = useState(
    settings.aiModel || 'claude-3-5-sonnet-20241022'
  );
  const [error, setError] = useState('');

  const availableModels = [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Most capable model, best for complex tasks'
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      description: 'Fastest model, good for simple tasks'
    }
  ];

  const handleSave = async () => {
    const updatedSettings = {
      ...settings,
      aiModel
    };

    const success = await onSave(updatedSettings);
    if (success) {
      onClose();
    } else {
      setError('Failed to save AI model settings');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">AI Model Selection</h2>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Select AI Model
        </label>
        <div className="space-y-3">
          {availableModels.map(model => (
            <div
              key={model.id}
              className={`p-4 border rounded cursor-pointer transition-colors ${
                aiModel === model.id
                  ? 'bg-blue-900 border-blue-700'
                  : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
              }`}
              onClick={() => setAiModel(model.id)}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="aiModel"
                  value={model.id}
                  checked={aiModel === model.id}
                  onChange={() => setAiModel(model.id)}
                  className="text-blue-600"
                />
                <div>
                  <div className="font-semibold">{model.name}</div>
                  <div className="text-sm text-gray-400">{model.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Model Information</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p><strong>Claude 3.5 Sonnet:</strong> Best for complex reasoning, analysis, and creative tasks. Higher quality responses but slower.</p>
          <p><strong>Claude 3.5 Haiku:</strong> Optimized for speed and efficiency. Good for simple questions and quick responses.</p>
        </div>
      </div>

      <div className="mb-4 p-3 bg-yellow-900 border border-yellow-700 rounded">
        <p className="text-yellow-200 text-sm">
          <strong>Note:</strong> Make sure your ANTHROPIC_API_KEY is set in the .env file for AI functionality to work.
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

export default AIModelSettings;
