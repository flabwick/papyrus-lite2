import React, { useState } from 'react';

const DiffBlock = ({ diffBlock, onStatusChange, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedOriginal, setEditedOriginal] = useState(diffBlock.original);
  const [editedProposed, setEditedProposed] = useState(diffBlock.proposed);

  const handleAccept = () => {
    onStatusChange(diffBlock.id, 'accepted');
  };

  const handleDecline = () => {
    onStatusChange(diffBlock.id, 'declined');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onEdit(diffBlock.id, editedOriginal, editedProposed);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedOriginal(diffBlock.original);
    setEditedProposed(diffBlock.proposed);
    setIsEditing(false);
  };

  const getStatusColor = () => {
    switch (diffBlock.status) {
      case 'accepted': return 'border-green-500 bg-green-50';
      case 'declined': return 'border-red-500 bg-red-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const renderDiffContent = () => {
    if (isEditing) {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Text:
            </label>
            <textarea
              value={editedOriginal}
              onChange={(e) => setEditedOriginal(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded font-mono text-sm"
              rows={Math.max(3, editedOriginal.split('\n').length)}
              placeholder="Original text to be replaced..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Text:
            </label>
            <textarea
              value={editedProposed}
              onChange={(e) => setEditedProposed(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded font-mono text-sm"
              rows={Math.max(3, editedProposed.split('\n').length)}
              placeholder="New text to replace with..."
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Save Changes
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="diff-content">
        {diffBlock.original && (
          <div className="mb-3">
            <div className="text-sm font-medium text-red-700 mb-1">- Remove:</div>
            <pre className="bg-red-100 border-l-4 border-red-500 p-3 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
              {diffBlock.original}
            </pre>
          </div>
        )}
        {diffBlock.proposed && (
          <div>
            <div className="text-sm font-medium text-green-700 mb-1">+ Add:</div>
            <pre className="bg-green-100 border-l-4 border-green-500 p-3 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
              {diffBlock.proposed}
            </pre>
          </div>
        )}
        {!diffBlock.original && !diffBlock.proposed && (
          <div className="text-gray-500 italic">Empty diff block</div>
        )}
      </div>
    );
  };

  return (
    <div className={`border-2 rounded-lg p-4 mb-4 ${getStatusColor()}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          {diffBlock.filePath && (
            <div className="text-xs text-blue-600 font-mono mb-1 bg-blue-50 px-2 py-1 rounded inline-block">
              📁 {diffBlock.filePath}
            </div>
          )}
          <h3 className="font-semibold text-gray-800">{diffBlock.description}</h3>
        </div>
        <div className="flex items-center space-x-2">
          {diffBlock.status === 'accepted' && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              ✓ Accepted
            </span>
          )}
          {diffBlock.status === 'declined' && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
              ✗ Declined
            </span>
          )}
          {diffBlock.status === 'pending' && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
              ⏳ Pending
            </span>
          )}
        </div>
      </div>

      {renderDiffContent()}

      {!isEditing && (
        <div className="flex space-x-2 mt-4">
          {diffBlock.status !== 'accepted' && (
            <button
              onClick={handleAccept}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Accept
            </button>
          )}
          {diffBlock.status !== 'declined' && (
            <button
              onClick={handleDecline}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Decline
            </button>
          )}
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Edit
          </button>
          {diffBlock.status !== 'pending' && (
            <button
              onClick={() => onStatusChange(diffBlock.id, 'pending')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DiffBlock;
