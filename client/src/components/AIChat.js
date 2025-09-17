import React, { useState, useRef, useEffect, useCallback } from 'react';
import StreamingMarkdownRenderer from './StreamingMarkdownRenderer';
import config from '../config';

const AIChat = ({ initialPrompt, settings, onClose }) => {
  const [document, setDocument] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, streaming, error
  const [input, setInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [exportPath, setExportPath] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fullPrompt, setFullPrompt] = useState('');
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const abortControllerRef = useRef(null);
  const streamTimeoutRef = useRef(null);
  const documentRef = useRef(null);

  useEffect(() => {
    // Send initial prompt automatically
    if (initialPrompt) {
      processPrompt(initialPrompt);
    }
  }, [initialPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }
    };
  }, []);

  const processPrompt = useCallback(async (prompt) => {
    // Store full prompt and create collapsed version
    setFullPrompt(prompt);
    setShowFullPrompt(false);
    
    const truncatedPrompt = prompt.length > 300 ? prompt.substring(0, 300) + '...' : prompt;
    const userSection = `${truncatedPrompt}`;
    setDocument(userSection);
    setStreamBuffer('');
    setError('');
    setConnectionStatus('connecting');
    setIsStreaming(true);
    setRetryCount(0);
    
    // Initialize conversation history with the first user message
    const initialHistory = [{ role: 'user', content: prompt }];
    setConversationHistory(initialHistory);
    
    await streamAIResponse(prompt, 0, []);
  }, [settings]);

  const streamAIResponse = useCallback(async (prompt, retryAttempt = 0, conversationHistory = []) => {
    try {
      // Clear any existing timeout first
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }
      
      // Only abort existing request if starting fresh (not a retry)
      if (retryAttempt === 0 && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Set stream timeout
      streamTimeoutRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setError('Stream timeout - connection took too long');
        setConnectionStatus('error');
        setIsStreaming(false);
      }, 30000); // 30 second timeout

      setConnectionStatus('streaming');
      
      const response = await fetch(`${config.apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          systemInstructions: settings.systemInstructions || 'You are a helpful AI assistant.',
          conversationHistory: conversationHistory
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let lastUpdateTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.chunk) {
                accumulatedText += data.chunk;
                
                // Throttle updates to prevent excessive re-renders
                const now = Date.now();
                if (now - lastUpdateTime > 50) { // Update max every 50ms
                  setStreamBuffer(accumulatedText);
                  lastUpdateTime = now;
                }
              }
              
              if (data.done) {
                // Clear timeout
                if (streamTimeoutRef.current) {
                  clearTimeout(streamTimeoutRef.current);
                }
                
                // Final update - add AI response to conversation history
                setStreamBuffer('');
                setDocument(prev => prev + '\n\n' + accumulatedText);
                
                // Update conversation history with AI response
                setConversationHistory(prev => [...prev, { role: 'assistant', content: accumulatedText }]);
                
                setConnectionStatus('idle');
                setIsStreaming(false);
                setShowInput(true);
                return;
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      // Clear timeout
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }
      
      if (error.name === 'AbortError') {
        setError('Request cancelled');
        setConnectionStatus('idle');
      } else {
        console.error('Stream error:', error);
        
        // Retry logic for network errors
        if (retryAttempt < 3 && (error.message.includes('fetch') || error.message.includes('network'))) {
          setRetryCount(retryAttempt + 1);
          setError(`Connection failed, retrying... (${retryAttempt + 1}/3)`);
          setTimeout(() => {
            streamAIResponse(prompt, retryAttempt + 1, conversationHistory);
          }, 2000 * (retryAttempt + 1)); // Exponential backoff
          return;
        }
        
        setError(`AI request failed: ${error.message}`);
        setConnectionStatus('error');
      }
      setIsStreaming(false);
    }
  }, [settings]);

  const handleFollowUp = useCallback(() => {
    if (input.trim() && !isStreaming) {
      // Add follow-up question in a compact format, then prepare for AI response
      const followUpSection = `\n\n---\n\n**Follow-up:** ${input.trim()}\n\n`;
      setDocument(prev => prev + followUpSection);
      
      // Add user message to conversation history
      const updatedHistory = [...conversationHistory, { role: 'user', content: input.trim() }];
      setConversationHistory(updatedHistory);
      
      setInput('');
      setShowInput(false);
      
      // Start streaming the AI response with full conversation history
      streamAIResponse(input.trim(), 0, updatedHistory);
    }
  }, [input, isStreaming, streamAIResponse, conversationHistory]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFollowUp();
    }
  }, [handleFollowUp]);

  const handleCopyDocument = useCallback(() => {
    const fullContent = document + streamBuffer;
    navigator.clipboard.writeText(fullContent).then(() => {
      // Could add success feedback here
    }).catch(() => {
      setError('Failed to copy to clipboard');
    });
  }, [document, streamBuffer]);

  const handleExportDocument = useCallback(() => {
    if (!exportPath.trim()) {
      setError('Export path cannot be empty');
      return;
    }

    if (!exportPath.endsWith('.md')) {
      setError('Export path must end with .md');
      return;
    }

    try {
      const fullContent = document + streamBuffer;
      const blob = new Blob([fullContent], { type: 'text/markdown' });
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
  }, [document, streamBuffer, exportPath]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
    }
    setIsStreaming(false);
    setStreamBuffer('');
    setConnectionStatus('idle');
    setShowInput(true);
  }, []);

  const retryRequest = useCallback(() => {
    if (initialPrompt) {
      processPrompt(initialPrompt);
    }
  }, [initialPrompt, processPrompt]);

  return (
    <div className="ai-chat-document h-screen flex flex-col bg-white text-gray-900">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-800">AI Document</h1>
          <div className="flex items-center space-x-2">
            {connectionStatus === 'connecting' && (
              <div className="flex items-center text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                <span className="text-sm">Connecting...</span>
              </div>
            )}
            {connectionStatus === 'streaming' && (
              <div className="flex items-center text-green-600">
                <div className="animate-pulse w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                <span className="text-sm">Streaming</span>
              </div>
            )}
            {connectionStatus === 'error' && (
              <div className="flex items-center text-red-600">
                <div className="w-2 h-2 bg-red-600 rounded-full mr-2"></div>
                <span className="text-sm">Error</span>
              </div>
            )}
            {retryCount > 0 && (
              <span className="text-xs text-gray-500">Retry {retryCount}/3</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyDocument}
            className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          >
            Copy All
          </button>
          <button
            onClick={() => setShowExportDialog(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Export
          </button>
          {isStreaming && (
            <button
              onClick={stopGeneration}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Stop
            </button>
          )}
          {connectionStatus === 'error' && (
            <button
              onClick={retryRequest}
              className="px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Document Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          {/* Prompt Section - Collapsed by default */}
          <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Your Prompt</h2>
              {fullPrompt.length > 300 && (
                <button
                  onClick={() => setShowFullPrompt(!showFullPrompt)}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {showFullPrompt ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
            <div className="text-sm text-gray-700 leading-relaxed">
              <StreamingMarkdownRenderer 
                content={showFullPrompt ? fullPrompt : document.split('\n\n')[0]}
                isStreaming={false}
              />
            </div>
          </div>

          {/* AI Response Sections - Parse and render each response prominently */}
          {(() => {
            const content = document.split('\n\n').slice(1).join('\n\n') + streamBuffer;
            const sections = content.split('---').filter(section => section.trim());
            
            return sections.map((section, index) => {
              const isFollowUp = section.includes('**Follow-up:**');
              const isAIResponse = !isFollowUp && section.trim();
              
              if (isFollowUp) {
                return (
                  <div key={index} className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r">
                    <div className="text-sm text-blue-800">
                      <StreamingMarkdownRenderer 
                        content={section.trim()}
                        isStreaming={false}
                      />
                    </div>
                  </div>
                );
              }
              
              if (isAIResponse) {
                return (
                  <div key={index} className="ai-response-section mb-8">
                    <div className="flex items-center mb-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">AI</span>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {index === 0 ? 'Response' : `Response ${Math.floor(index/2) + 1}`}
                        </h2>
                      </div>
                      {connectionStatus === 'streaming' && index === sections.length - 1 && (
                        <div className="ml-auto flex items-center text-blue-600">
                          <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          <span className="text-sm">Writing...</span>
                        </div>
                      )}
                    </div>
                    
                    <div 
                      ref={index === sections.length - 1 ? documentRef : null}
                      className="prose prose-lg max-w-none ai-content"
                      style={{ 
                        lineHeight: '1.8',
                        '--tw-prose-body': 'rgb(17 24 39)',
                        '--tw-prose-p': 'rgb(17 24 39)'
                      }}
                    >
                      <StreamingMarkdownRenderer 
                        content={section.trim()}
                        isStreaming={connectionStatus === 'streaming' && index === sections.length - 1}
                      />
                    </div>
                  </div>
                );
              }
              
              return null;
            });
          })()}
          
          {/* Initial loading state */}
          {!document.split('\n\n').slice(1).join('\n\n') && !streamBuffer && connectionStatus === 'connecting' && (
            <div className="ai-response-section">
              <div className="flex items-center mb-6">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">AI</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Response</h2>
                </div>
              </div>
              <div className="flex items-center text-gray-500">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                <span>Connecting to AI...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Follow-up Input */}
      {showInput && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question... (Shift+Enter for new line)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="2"
              />
              <button
                onClick={handleFollowUp}
                disabled={!input.trim() || isStreaming}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Export Document</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={exportPath}
                onChange={(e) => setExportPath(e.target.value)}
                placeholder="filename.md"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleExportDocument}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Export
                </button>
                <button
                  onClick={() => {
                    setShowExportDialog(false);
                    setExportPath('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;
