import React, { useState, useRef, useEffect } from 'react';

const CLI = ({ onCommand, history, getSuggestions }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    // Auto-focus input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom when history updates
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    // Update suggestions when input changes
    const newSuggestions = getSuggestions(input);
    setSuggestions(newSuggestions);
    setSelectedSuggestion(-1);
  }, [input, getSuggestions]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      let commandToExecute = input.trim();

      // Auto-complete with selected suggestion or first suggestion
      if (suggestions.length > 0) {
        if (selectedSuggestion >= 0) {
          commandToExecute = suggestions[selectedSuggestion];
        } else if (input.startsWith('/')) {
          commandToExecute = suggestions[0];
        }
      }

      if (commandToExecute) {
        onCommand(commandToExecute);
        setInput('');
        setSuggestions([]);
        setSelectedSuggestion(-1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedSuggestion(prev => 
          prev <= 0 ? suggestions.length - 1 : prev - 1
        );
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedSuggestion(prev => 
          prev >= suggestions.length - 1 ? 0 : prev + 1
        );
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setSelectedSuggestion(-1);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onCommand(suggestion);
    setInput('');
    setSuggestions([]);
    setSelectedSuggestion(-1);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Terminal Header */}
      <div className="bg-gray-800 text-white px-4 py-2 border-b border-gray-600">
        <h1 className="text-lg font-bold">Papyrus Lite 2 - AI Prompt CLI</h1>
        <p className="text-sm text-gray-300">
          Type commands with / or enter raw text. Press ESC to clear suggestions.
        </p>
      </div>

      {/* Terminal Content */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {/* History */}
        {history.map((entry, index) => (
          <div key={index} className="flex items-start space-x-2">
            <span className="text-gray-500 text-xs min-w-[60px]">
              {formatTimestamp(entry.timestamp)}
            </span>
            <div className="flex-1">
              {entry.type === 'command' && (
                <div className="text-terminal-prompt">
                  <span className="text-terminal-prompt">$ </span>
                  <span>{entry.content}</span>
                </div>
              )}
              {entry.type === 'error' && (
                <div className="text-terminal-error">
                  Error: {entry.content}
                </div>
              )}
              {entry.type === 'success' && (
                <div className="text-terminal-success">
                  {entry.content}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Current Input Line */}
        <div className="flex items-center space-x-2">
          <span className="text-gray-500 text-xs min-w-[60px]">
            {new Date().toLocaleTimeString()}
          </span>
          <div className="flex-1 flex items-center">
            <span className="text-terminal-prompt">$ </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="terminal-input ml-1"
              placeholder="Type a command (e.g., /prompts) or raw text..."
              autoComplete="off"
            />
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="ml-[68px] bg-gray-800 border border-gray-600 rounded max-w-md">
            <div className="p-2 text-xs text-gray-400 border-b border-gray-600">
              Suggestions (↑↓ to navigate, Enter to select):
            </div>
            {suggestions.slice(0, 8).map((suggestion, index) => (
              <div
                key={suggestion}
                className={`px-3 py-1 cursor-pointer suggestion-item ${
                  index === selectedSuggestion ? 'selected bg-gray-700' : ''
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))}
            {suggestions.length > 8 && (
              <div className="px-3 py-1 text-xs text-gray-500">
                ... and {suggestions.length - 8} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Footer */}
      <div className="bg-gray-800 text-gray-400 px-4 py-2 border-t border-gray-600 text-xs">
        Commands: /restart /prompts /subs /system /ai-model /root | 
        Type prompt names with / or raw text without /
      </div>
    </div>
  );
};

export default CLI;
