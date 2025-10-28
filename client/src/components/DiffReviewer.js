import React, { useState } from 'react';
import DiffBlock from './DiffBlock';
import { parseDiffBlocks, applyDiffChanges } from '../utils/diffParser';
import config from '../config';

const DiffReviewer = ({ onClose }) => {
  const [pastedContent, setPastedContent] = useState('');
  const [diffBlocks, setDiffBlocks] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [availableFiles, setAvailableFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleParseDiffs = () => {
    if (!pastedContent.trim()) {
      setError('Please paste some diff content first');
      return;
    }

    try {
      const blocks = parseDiffBlocks(pastedContent);
      if (blocks.length === 0) {
        setError('No valid diff blocks found. Please check the format.');
        return;
      }
      
      setDiffBlocks(blocks);
      setError('');
      setSuccess(`Found ${blocks.length} diff block${blocks.length === 1 ? '' : 's'}`);
      
      // Auto-select file if all blocks target the same file
      const uniqueFilePaths = [...new Set(blocks.map(b => b.filePath).filter(Boolean))];
      if (uniqueFilePaths.length === 1) {
        setSelectedFile(uniqueFilePaths[0]);
        setSuccess(`Found ${blocks.length} diff block${blocks.length === 1 ? '' : 's'} targeting ${uniqueFilePaths[0]}`);
      }
      
      // Load available files for selection
      loadAvailableFiles();
    } catch (err) {
      setError('Error parsing diff blocks: ' + err.message);
    }
  };

  const loadAvailableFiles = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/files`);
      if (response.ok) {
        const files = await response.json();
        setAvailableFiles(files);
      }
    } catch (err) {
      console.error('Error loading files:', err);
    }
  };

  const handleStatusChange = (blockId, newStatus) => {
    setDiffBlocks(blocks => 
      blocks.map(block => 
        block.id === blockId 
          ? { ...block, status: newStatus }
          : block
      )
    );
  };

  const handleEditBlock = (blockId, newOriginal, newProposed) => {
    setDiffBlocks(blocks => 
      blocks.map(block => 
        block.id === blockId 
          ? { ...block, original: newOriginal, proposed: newProposed }
          : block
      )
    );
  };

  const handleApplyChanges = async () => {
    if (!selectedFile) {
      setError('Please select a file to apply changes to');
      return;
    }

    const acceptedBlocks = diffBlocks.filter(block => block.status === 'accepted');
    if (acceptedBlocks.length === 0) {
      setError('No changes accepted. Please accept at least one diff block.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get current file content
      const fileResponse = await fetch(`${config.apiUrl}/api/files/${selectedFile}`);
      if (!fileResponse.ok) {
        throw new Error('Failed to load file content');
      }
      
      const fileContent = await fileResponse.text();
      
      // Apply changes
      const modifiedContent = applyDiffChanges(fileContent, acceptedBlocks);
      
      // Save modified content
      const saveResponse = await fetch(`${config.apiUrl}/api/files/${selectedFile}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: modifiedContent
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save file changes');
      }

      setSuccess(`Successfully applied ${acceptedBlocks.length} change${acceptedBlocks.length === 1 ? '' : 's'} to ${selectedFile}`);
      
      // Mark applied blocks as completed
      setDiffBlocks(blocks => 
        blocks.map(block => 
          block.status === 'accepted' 
            ? { ...block, status: 'applied' }
            : block
        )
      );

    } catch (err) {
      setError('Error applying changes: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusSummary = () => {
    const accepted = diffBlocks.filter(b => b.status === 'accepted').length;
    const declined = diffBlocks.filter(b => b.status === 'declined').length;
    const pending = diffBlocks.filter(b => b.status === 'pending').length;
    const applied = diffBlocks.filter(b => b.status === 'applied').length;

    return { accepted, declined, pending, applied, total: diffBlocks.length };
  };

  const summary = getStatusSummary();

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Diff Reviewer</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ×
        </button>
      </div>

      {/* Input Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paste Diff Response:
        </label>
        <textarea
          value={pastedContent}
          onChange={(e) => setPastedContent(e.target.value)}
          className="w-full h-40 p-3 border border-gray-300 rounded-lg font-mono text-sm"
          placeholder={`Paste your diff response here in the enhanced format:

<!-- File: path/to/file.ext -->
<!-- Change: description -->
\`\`\`diff
<<<<<<< ORIGINAL
original text
=======
new text
>>>>>>> PROPOSED
\`\`\``}
        />
        <div className="mt-2 flex space-x-2">
          <button
            onClick={handleParseDiffs}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Parse Diffs
          </button>
          <button
            onClick={() => {
              setPastedContent('');
              setDiffBlocks([]);
              setError('');
              setSuccess('');
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Summary and File Selection */}
      {diffBlocks.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              Total: {summary.total} | 
              Pending: {summary.pending} | 
              Accepted: {summary.accepted} | 
              Declined: {summary.declined}
              {summary.applied > 0 && ` | Applied: ${summary.applied}`}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Target File:
            </label>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded text-sm"
            >
              <option value="">Select a file to apply changes to...</option>
              {/* Show files from diff blocks first */}
              {[...new Set(diffBlocks.map(b => b.filePath).filter(Boolean))].map(file => (
                <option key={`diff-${file}`} value={file}>
                  🎯 {file} (from diff)
                </option>
              ))}
              {/* Then show other available files */}
              {availableFiles.filter(file => 
                !diffBlocks.some(b => b.filePath === file)
              ).map(file => (
                <option key={file} value={file}>{file}</option>
              ))}
            </select>
            <button
              onClick={handleApplyChanges}
              disabled={isLoading || !selectedFile || summary.accepted === 0}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Applying...' : `Apply ${summary.accepted} Change${summary.accepted === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      {/* Diff Blocks */}
      <div className="space-y-4">
        {diffBlocks.map(block => (
          <DiffBlock
            key={block.id}
            diffBlock={block}
            onStatusChange={handleStatusChange}
            onEdit={handleEditBlock}
          />
        ))}
      </div>

      {diffBlocks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg mb-2">No diff blocks loaded</div>
          <div className="text-sm">
            Paste a diff response above and click "Parse Diffs" to get started
          </div>
        </div>
      )}
    </div>
  );
};

export default DiffReviewer;
