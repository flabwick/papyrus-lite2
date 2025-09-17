import React, { useState } from 'react';

const AIModelSettings = ({ settings, onSave, onClose }) => {
  const [aiModel, setAiModel] = useState(
    settings.aiModel || 'claude-3-5-sonnet-20241022'
  );
  const [error, setError] = useState('');

  const availableModels = [
    {
      id: 'claude-opus-4',
      name: 'Claude Opus 4',
      description: 'Most powerful model, best for coding and complex problem-solving',
      provider: 'anthropic'
    },
    {
      id: 'claude-sonnet-4',
      name: 'Claude Sonnet 4',
      description: 'Balanced performance and efficiency, excellent for coding',
      provider: 'anthropic'
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Previous generation, reliable for most tasks',
      provider: 'anthropic'
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      description: 'Fastest model, good for simple tasks',
      provider: 'anthropic'
    },
    {
      id: 'gpt-5',
      name: 'GPT-5',
      description: 'OpenAI\'s most capable model with advanced reasoning',
      provider: 'openai'
    },
    {
      id: 'gpt-5-mini',
      name: 'GPT-5 Mini',
      description: 'Faster and more cost-effective version of GPT-5',
      provider: 'openai'
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
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="font-semibold">{model.name}</div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      model.provider === 'anthropic' 
                        ? 'bg-orange-900 text-orange-200' 
                        : 'bg-green-900 text-green-200'
                    }`}>
                      {model.provider === 'anthropic' ? 'Anthropic' : 'OpenAI'}
                    </span>
                  </div>
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
          <p><strong>Claude Opus 4:</strong> Most powerful model with state-of-the-art coding capabilities and complex problem-solving. Best for demanding tasks.</p>
          <p><strong>Claude Sonnet 4:</strong> Excellent balance of performance and efficiency. Great for coding and everyday complex tasks.</p>
          <p><strong>Claude 3.5 Sonnet:</strong> Reliable previous generation model for complex reasoning and analysis.</p>
          <p><strong>Claude 3.5 Haiku:</strong> Fastest Claude model, optimized for speed and simple tasks.</p>
          <p><strong>GPT-5:</strong> OpenAI's latest flagship model with advanced reasoning capabilities and broad knowledge.</p>
          <p><strong>GPT-5 Mini:</strong> More efficient version of GPT-5, faster responses with good performance.</p>
        </div>
      </div>

      <div className="mb-4 p-3 bg-yellow-900 border border-yellow-700 rounded">
        <p className="text-yellow-200 text-sm">
          <strong>Note:</strong> Make sure your API keys are set in the .env file:
          <br />• ANTHROPIC_API_KEY for Claude models
          <br />• OPENAI_API_KEY for GPT models
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
