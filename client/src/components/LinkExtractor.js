import React, { useState, useEffect } from 'react';
import config from '../config';

const LinkExtractor = ({ 
  promptContent, 
  substitutes, 
  settings, 
  prompts,
  onOpenPromptsManager, 
  onOpenSubstitutesManager 
}) => {
  const [extractedLinks, setExtractedLinks] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editSubstituteValue, setEditSubstituteValue] = useState('');
  const [showCombinedManager, setShowCombinedManager] = useState(false);

  useEffect(() => {
    if (promptContent) {
      analyzeLinks();
    }
  }, [promptContent, substitutes]);

  const analyzeLinks = async () => {
    setIsAnalyzing(true);
    const linkRegex = /\{\{([^}]+)\}\}/g;
    const links = [];
    let match;

    while ((match = linkRegex.exec(promptContent)) !== null) {
      const linkContent = match[1].trim();
      const linkData = await analyzeLinkContent(linkContent, match.index);
      links.push(linkData);
    }

    setExtractedLinks(links);
    setIsAnalyzing(false);
  };

  const analyzeLinkContent = async (linkContent, position) => {
    const linkData = {
      raw: linkContent,
      position,
      type: 'unknown',
      isValid: false,
      error: null,
      details: {},
      wordCount: 0,
      tokenCount: 0
    };

    // Check if it's a substitute first
    if (substitutes[linkContent]) {
      linkData.type = 'substitute';
      linkData.isValid = true;
      linkData.details = {
        substituteValue: substitutes[linkContent],
        resolvedContent: await resolveSubstitute(linkContent)
      };
      linkData.wordCount = countWords(linkData.details.resolvedContent);
      linkData.tokenCount = estimateTokens(linkData.details.resolvedContent);
      return linkData;
    }

    // Parse as file link
    const parsedLink = parseFileLink(linkContent);
    linkData.type = parsedLink.type;
    linkData.details = parsedLink;

    // Validate the file link
    const validation = await validateFileLink(parsedLink);
    linkData.isValid = validation.isValid;
    linkData.error = validation.error;
    linkData.wordCount = validation.wordCount || 0;
    linkData.tokenCount = validation.tokenCount || 0;

    return linkData;
  };

  const parseFileLink = (linkContent) => {
    const result = {
      type: 'file',
      path: '',
      headingSelector: null,
      isWildcard: false,
      isRecursive: false,
      filePattern: null,
      headingType: null,
      headingValue: null,
      modifiers: []
    };

    // Split on # to separate path from heading selector
    const parts = linkContent.split('#');
    result.path = parts[0];

    // Analyze path for wildcards
    if (result.path.includes('**')) {
      result.type = 'recursive_wildcard';
      result.isRecursive = true;
      result.isWildcard = true;
    } else if (result.path.includes('*')) {
      result.type = 'wildcard';
      result.isWildcard = true;
    }

    // Extract file pattern if wildcard
    if (result.isWildcard) {
      const pathParts = result.path.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart.includes('*')) {
        result.filePattern = lastPart;
      }
    }

    // Parse heading selector if present
    if (parts.length > 1) {
      result.headingSelector = parts[1];
      const headingInfo = parseHeadingSelector(parts[1]);
      result.headingType = headingInfo.type;
      result.headingValue = headingInfo.value;
      result.modifiers = headingInfo.modifiers;
    }

    return result;
  };

  const parseHeadingSelector = (selector) => {
    const result = {
      type: 'simple',
      value: selector,
      modifiers: []
    };

    // Level-based selection (=2, =2-4, =2:Heading)
    if (selector.startsWith('=')) {
      result.type = 'level';
      const levelPart = selector.substring(1);
      
      if (levelPart.includes(':')) {
        const [levels, heading] = levelPart.split(':');
        result.value = { levels, heading };
        result.type = 'level_constrained';
      } else if (levelPart.includes('-')) {
        const [start, end] = levelPart.split('-');
        result.value = { start: parseInt(start), end: parseInt(end) };
        result.type = 'level_range';
      } else {
        result.value = parseInt(levelPart);
      }
      return result;
    }

    // Range selection (Start..End)
    if (selector.includes('..')) {
      result.type = 'range';
      const [start, end] = selector.split('..');
      result.value = { 
        start: end.endsWith('!') ? end.slice(0, -1) : start, 
        end: end.endsWith('!') ? end.slice(0, -1) : end,
        excludeNested: end.endsWith('!')
      };
      if (end.endsWith('!')) {
        result.modifiers.push('exclude_nested');
      }
      return result;
    }

    // Multiple headings (One,Two,Three)
    if (selector.includes(',')) {
      result.type = 'multiple';
      result.value = selector.split(',').map(h => h.trim());
      return result;
    }

    // Regex pattern (/^Week \d+/)
    if (selector.startsWith('/') && selector.endsWith('/')) {
      result.type = 'regex';
      result.value = selector.slice(1, -1);
      return result;
    }

    // Case-insensitive (i:heading)
    if (selector.startsWith('i:')) {
      result.type = 'case_insensitive';
      result.value = selector.substring(2);
      result.modifiers.push('case_insensitive');
      return result;
    }

    // Quoted headings ("Heading: Part 1")
    if (selector.startsWith('"') && selector.endsWith('"')) {
      result.type = 'quoted';
      result.value = selector.slice(1, -1);
      return result;
    }

    // Exclude nested content (Heading!)
    if (selector.endsWith('!')) {
      result.type = 'exclude_nested';
      result.value = selector.slice(0, -1);
      result.modifiers.push('exclude_nested');
      return result;
    }

    return result;
  };

  const validateFileLink = async (parsedLink) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/validate-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          linkData: parsedLink,
          rootPath: settings?.rootFolder || ''
        })
      });

      if (!response.ok) {
        return {
          isValid: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          wordCount: 0,
          tokenCount: 0
        };
      }

      const result = await response.json();
      return {
        isValid: !result.error,
        error: result.error,
        wordCount: result.wordCount || 0,
        tokenCount: result.tokenCount || 0,
        matchedFiles: result.matchedFiles || [],
        resolvedContent: result.content
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Network error: ${error.message}`,
        wordCount: 0,
        tokenCount: 0
      };
    }
  };

  const resolveSubstitute = async (substituteName) => {
    try {
      // Recursively resolve substitute content
      const content = substitutes[substituteName];
      if (!content) return '';
      
      // Process any nested links in the substitute
      return await processSubstitutions(content, substitutes, settings);
    } catch (error) {
      return `[ERROR: ${error.message}]`;
    }
  };

  const processSubstitutions = async (content, subs, settings, visited = new Set()) => {
    let result = content;
    const linkRegex = /\{\{([^}]+)\}\}/g;
    let match;
    const promises = [];

    while ((match = linkRegex.exec(content)) !== null) {
      const linkName = match[1].trim();
      
      if (visited.has(linkName)) {
        continue;
      }

      promises.push(processLink(linkName, subs, settings, new Set([...visited, linkName])));
    }

    const results = await Promise.allSettled(promises);
    let index = 0;
    
    result = content.replace(linkRegex, (match, linkName) => {
      const trimmedLinkName = linkName.trim();
      const promiseResult = results[index++];
      
      if (promiseResult.status === 'fulfilled') {
        return promiseResult.value || `[ERROR: Could not resolve ${trimmedLinkName}]`;
      } else {
        return `[ERROR: Could not resolve ${trimmedLinkName}]`;
      }
    });

    return result;
  };

  const processLink = async (linkName, subs, settings, visited) => {
    if (subs[linkName]) {
      return await processSubstitutions(subs[linkName], subs, settings, visited);
    }

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
        return `[FILE ERROR: ${data.error}]`;
      }

      return await processSubstitutions(data.content, subs, settings, visited);
    } catch (error) {
      return `[NETWORK ERROR: ${error.message}]`;
    }
  };

  const countWords = (text) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const estimateTokens = (text) => {
    if (!text) return 0;
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  };

  const handleEditLink = (link) => {
    setEditingLink(link);
    setEditValue(link.raw);
    
    // If it's a substitute, also set the substitute value for editing
    if (link.type === 'substitute') {
      setEditSubstituteValue(substitutes[link.raw] || '');
    } else {
      setEditSubstituteValue('');
    }
  };

  const handleSaveEdit = () => {
    // For substitutes, we need to update both the link name and its mapping
    if (editingLink.type === 'substitute' && editingLink.raw !== editValue) {
      // Substitute name changed - this would require updating the prompt content
      // and potentially the substitutes object
      console.log('Substitute name change:', editingLink.raw, '->', editValue);
      console.log('Substitute value:', editSubstituteValue);
    } else if (editingLink.type === 'substitute') {
      // Only substitute value changed
      console.log('Substitute value change for:', editValue, '->', editSubstituteValue);
    } else {
      // File link changed
      console.log('File link change:', editingLink.raw, '->', editValue);
    }
    
    // Reset edit state
    setEditingLink(null);
    setEditValue('');
    setEditSubstituteValue('');
  };

  const openCombinedManager = () => {
    setShowCombinedManager(true);
  };

  const getLinkTypeDisplay = (link) => {
    switch (link.type) {
      case 'substitute':
        return 'Substitute';
      case 'file':
        return 'Direct File';
      case 'wildcard':
        return 'Wildcard';
      case 'recursive_wildcard':
        return 'Recursive Wildcard';
      default:
        return 'Unknown';
    }
  };

  const getErrorMessage = (link) => {
    if (!link.error) return null;
    
    // Provide detailed error messages based on link type
    if (link.type === 'wildcard' || link.type === 'recursive_wildcard') {
      if (link.error.includes('No files found')) {
        return `No files match pattern "${link.details.filePattern || '*'}" in path "${link.details.path}"`;
      }
    }
    
    if (link.type === 'file') {
      if (link.error.includes('File not found')) {
        return `File does not exist: "${link.details.path}"`;
      }
      if (link.error.includes('Heading not found')) {
        return `Heading "${link.details.headingValue}" not found in file`;
      }
    }
    
    return link.error;
  };

  if (isAnalyzing) {
    return (
      <div className="mt-4 p-4 bg-gray-800 border border-gray-600 rounded">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          <span className="text-sm text-gray-400">Analyzing links...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">
          Link Analysis ({extractedLinks.length} links found)
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={onOpenPromptsManager}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            title="Manage Prompts (Ctrl+P)"
          >
            Prompts
          </button>
          <button
            onClick={onOpenSubstitutesManager}
            className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 rounded transition-colors"
            title="Manage Substitutes (Ctrl+S)"
          >
            Substitutes
          </button>
        </div>
      </div>

      {extractedLinks.length === 0 ? (
        <div className="p-4 bg-gray-800 border border-gray-600 rounded text-center text-gray-400">
          No links found in this prompt
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {extractedLinks.map((link, index) => (
            <div
              key={index}
              className={`p-3 rounded border ${
                link.isValid
                  ? 'bg-green-900 border-green-700'
                  : 'bg-red-900 border-red-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      link.isValid ? 'bg-green-400' : 'bg-red-400'
                    }`}></span>
                    <span className="font-mono text-sm">{`{{${link.raw}}}`}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      link.isValid 
                        ? 'bg-green-700 text-green-200' 
                        : 'bg-red-700 text-red-200'
                    }`}>
                      {getLinkTypeDisplay(link)}
                    </span>
                  </div>

                  {link.isValid ? (
                    <div className="text-sm text-gray-300">
                      <div className="flex space-x-4">
                        <span>Words: {link.wordCount}</span>
                        <span>Tokens: ~{link.tokenCount}</span>
                      </div>
                      
                      {link.type === 'substitute' && (
                        <div className="mt-1 text-xs text-gray-400">
                          Maps to: {link.details.substituteValue.substring(0, 50)}
                          {link.details.substituteValue.length > 50 ? '...' : ''}
                        </div>
                      )}
                      
                      {(link.type === 'wildcard' || link.type === 'recursive_wildcard') && 
                       link.details.matchedFiles && (
                        <div className="mt-1 text-xs text-gray-400">
                          Matches {link.details.matchedFiles.length} files
                        </div>
                      )}
                      
                      {link.details.headingSelector && (
                        <div className="mt-1 text-xs text-gray-400">
                          Heading: {link.details.headingSelector}
                          {link.details.modifiers.length > 0 && 
                           ` (${link.details.modifiers.join(', ')})`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-red-200">
                      <div className="font-medium">Error:</div>
                      <div>{getErrorMessage(link)}</div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleEditLink(link)}
                  className="ml-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-[600px] max-w-[90vw]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Edit {editingLink.type === 'substitute' ? 'Substitute' : 'Link'}
              </h3>
              {editingLink.type === 'substitute' && (
                <button
                  onClick={openCombinedManager}
                  className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                >
                  Manage All
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Link Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {editingLink.type === 'substitute' ? 'Substitute Name' : 'Link Path'}
                </label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                  placeholder={editingLink.type === 'substitute' ? 'substitute-name' : 'path/to/file.md'}
                />
              </div>

              {/* Substitute Value (only for substitutes) */}
              {editingLink.type === 'substitute' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Maps To
                  </label>
                  <textarea
                    value={editSubstituteValue}
                    onChange={(e) => setEditSubstituteValue(e.target.value)}
                    className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm resize-none"
                    placeholder="Enter what this substitute maps to... Can include other {{links}} or file paths"
                  />
                  <div className="mt-1 text-xs text-gray-400">
                    Can contain file paths (e.g., path/to/file.md) or other substitutes (e.g., {`{{other-substitute}}`})
                  </div>
                </div>
              )}

              {/* Quick Actions for Substitutes */}
              {editingLink.type === 'substitute' && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                  <span className="text-sm text-gray-400">Quick Actions:</span>
                  <button
                    onClick={onOpenPromptsManager}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Prompts
                  </button>
                  <button
                    onClick={onOpenSubstitutesManager}
                    className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                  >
                    Substitutes
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setEditingLink(null);
                  setEditValue('');
                  setEditSubstituteValue('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combined Manager Dialog */}
      {showCombinedManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-[800px] max-w-[95vw] h-[600px] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Prompts & Substitutes Manager</h3>
              <button
                onClick={() => setShowCombinedManager(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
              {/* Prompts Section */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-blue-400">Prompts</h4>
                  <button
                    onClick={() => {
                      setShowCombinedManager(false);
                      onOpenPromptsManager();
                    }}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Full Manager
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 bg-gray-900 rounded p-3">
                  {Object.keys(prompts).length === 0 ? (
                    <div className="text-gray-500 text-center py-4">No prompts yet</div>
                  ) : (
                    Object.entries(prompts).map(([name, content]) => (
                      <div key={name} className="p-2 bg-gray-800 rounded border border-gray-700">
                        <div className="font-mono text-sm text-blue-300">//{name}</div>
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          {content.substring(0, 80)}{content.length > 80 ? '...' : ''}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Substitutes Section */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-purple-400">Substitutes</h4>
                  <button
                    onClick={() => {
                      setShowCombinedManager(false);
                      onOpenSubstitutesManager();
                    }}
                    className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                  >
                    Full Manager
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 bg-gray-900 rounded p-3">
                  {Object.keys(substitutes).length === 0 ? (
                    <div className="text-gray-500 text-center py-4">No substitutes yet</div>
                  ) : (
                    Object.entries(substitutes).map(([name, content]) => (
                      <div key={name} className="p-2 bg-gray-800 rounded border border-gray-700">
                        <div className="font-mono text-sm text-purple-300">{name}</div>
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          {content.substring(0, 80)}{content.length > 80 ? '...' : ''}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-400 text-center">
              Use {`{{substitute-name}}`} in prompts to reference substitutes • Use {`{{path/to/file.md}}`} for direct file links
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkExtractor;
