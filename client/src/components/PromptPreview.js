import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import config from '../config';
import LinkExtractor from './LinkExtractor';

const PromptPreview = ({ promptName, promptContent, substitutes, settings, prompts, onClose, onOpenChat, onSavePrompt, onOpenPromptsManager, onOpenSubstitutesManager }) => {
  const [renderedContent, setRenderedContent] = useState('');
  const [isRendered, setIsRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportPath, setExportPath] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState(promptContent);

  const renderContent = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const rendered = await processSubstitutions(promptContent, substitutes, settings);
      setRenderedContent(rendered);
      setIsRendered(true);
    } catch (err) {
      setError(`Rendering error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const processSubstitutions = async (content, subs, settings, visited = new Set()) => {
    let result = content;
    const linkRegex = /\{\{([^}]+)\}\}/g;
    let match;
    const promises = [];

    while ((match = linkRegex.exec(content)) !== null) {
      const linkName = match[1].trim();
      
      // Prevent infinite recursion
      if (visited.has(linkName)) {
        continue;
      }

      promises.push(processLink(linkName, subs, settings, new Set([...visited, linkName])));
    }

    // Use Promise.allSettled to handle failures gracefully
    const results = await Promise.allSettled(promises);
    let index = 0;
    
    result = content.replace(linkRegex, (match, linkName) => {
      const trimmedLinkName = linkName.trim();
      const promiseResult = results[index++];
      
      if (promiseResult.status === 'fulfilled') {
        return promiseResult.value || `[ERROR: Could not resolve ${trimmedLinkName}]`;
      } else {
        console.error(`Failed to process link ${trimmedLinkName}:`, promiseResult.reason);
        return `[ERROR: Could not resolve ${trimmedLinkName}]`;
      }
    });

    return result;
  };

  const processLink = async (linkName, subs, settings, visited) => {
    // Check if it's a substitute
    if (subs[linkName]) {
      return await processSubstitutions(subs[linkName], subs, settings, visited);
    }

    // Treat as file path
    try {
      const response = await fetch(`${config.apiUrl}/api/read-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: linkName })
      });

      if (!response.ok) {
        return `[HTTP ERROR: ${response.status} ${response.statusText}]`;
      }

      const data = await response.json();
      
      if (data.error) {
        console.error(`File read error for ${linkName}:`, data.error);
        return `[FILE ERROR: ${data.error}]`;
      }

      // Process any substitutions in the file content
      return await processSubstitutions(data.content, subs, settings, visited);
    } catch (error) {
      console.error(`Network error reading ${linkName}:`, error);
      return `[NETWORK ERROR: ${error.message}]`;
    }
  };

  const handleCopy = () => {
    const contentToCopy = isRendered ? renderedContent : promptContent;
    navigator.clipboard.writeText(contentToCopy).then(() => {
      // Could add a toast notification here
    });
  };

  const handleSendToAI = () => {
    const contentToSend = isRendered ? renderedContent : promptContent;
    onOpenChat(contentToSend);
  };

  const handleExport = async () => {
    if (!exportPath.trim()) {
      setError('Export path cannot be empty');
      return;
    }

    if (!exportPath.endsWith('.md')) {
      setError('Export path must end with .md');
      return;
    }

    try {
      const contentToExport = isRendered ? renderedContent : promptContent;
      const blob = new Blob([contentToExport], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportPath;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExportDialog(false);
      setExportPath('');
    } catch (error) {
      setError(`Export failed: ${error.message}`);
    }
  };

  const handleSaveEdit = async () => {
    if (promptName === 'Raw Input') {
      setError('Cannot edit raw input. Use the prompts manager to create a new prompt.');
      return;
    }

    if (!editContent.trim()) {
      setError('Prompt content cannot be empty');
      return;
    }

    try {
      const success = await onSavePrompt(promptName, editContent);
      if (success) {
        setShowEditDialog(false);
        setError('');
        // Update the local content to reflect the changes
        // Note: The parent component should handle updating the actual prompt content
      } else {
        setError('Failed to save prompt changes');
      }
    } catch (error) {
      setError(`Save failed: ${error.message}`);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">
        {promptName === 'Raw Input' ? 'Raw Input Preview' : `Prompt: /${promptName}`}
      </h2>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-700">
        <button
          onClick={isRendered ? () => setIsRendered(false) : renderContent}
          disabled={isLoading}
          className={`px-4 py-2 rounded transition-colors ${
            isRendered 
              ? 'bg-yellow-600 hover:bg-yellow-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Rendering...' : (isRendered ? 'Reverse' : 'Render')}
        </button>
        
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
        >
          Copy
        </button>
        
        <button
          onClick={handleSendToAI}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
        >
          Send to AI
        </button>
        
        <button
          onClick={() => setShowExportDialog(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded transition-colors"
        >
          Export
        </button>
        
        {promptName !== 'Raw Input' && (
          <button
            onClick={() => {
              setEditContent(promptContent);
              setShowEditDialog(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="mb-4 p-4 bg-gray-800 border border-gray-600 rounded">
          <h3 className="text-lg font-semibold mb-2">Export to File</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={exportPath}
              onChange={(e) => setExportPath(e.target.value)}
              placeholder="filename.md"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
            >
              Export
            </button>
            <button
              onClick={() => {
                setShowExportDialog(false);
                setExportPath('');
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {showEditDialog && (
        <div className="mb-4 p-4 bg-gray-800 border border-gray-600 rounded">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Edit Prompt: /{promptName}</h3>
            {onOpenPromptsManager && (
              <button
                onClick={() => {
                  setShowEditDialog(false);
                  onOpenPromptsManager();
                }}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Full Prompts Manager
              </button>
            )}
          </div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Enter prompt content... Use {{link-name}} for substitutions"
            className="w-full h-40 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm resize-none mb-3"
          />
          <div className="text-sm text-gray-400 mb-3">
            Use {`{{link-name}}`} for substitutions. Links can be file paths or substitute names.
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                setShowEditDialog(false);
                setEditContent(promptContent);
                setError('');
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content Display */}
      <div className="bg-gray-800 border border-gray-600 rounded p-4 max-h-96 overflow-y-auto">
        {isRendered ? (
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{renderedContent}</ReactMarkdown>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300">
            {promptContent}
          </pre>
        )}
      </div>

      {/* Link Analysis */}
      <LinkExtractor
        promptContent={promptContent}
        substitutes={substitutes}
        settings={settings}
        prompts={prompts}
        onOpenPromptsManager={onOpenPromptsManager}
        onOpenSubstitutesManager={onOpenSubstitutesManager}
      />
    </div>
  );
};

export default PromptPreview;
