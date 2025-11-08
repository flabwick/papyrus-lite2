import React, { useState, useEffect } from 'react';
import CLI from './components/CLI';
import Modal from './components/Modal';
import PromptsManager from './components/PromptsManager';
import SubstitutesManager from './components/SubstitutesManager';
import SystemSettings from './components/SystemSettings';
import AIModelSettings from './components/AIModelSettings';
import RootFolderSettings from './components/RootFolderSettings';
import PromptPreview from './components/PromptPreview';
import AIChat from './components/AIChat';
import PromptSheetSelector from './components/PromptSheetSelector';
import PromptSheetCreator from './components/PromptSheetCreator';
import PromptSheetDeleter from './components/PromptSheetDeleter';
import DiffReviewer from './components/DiffReviewer';
import config from './config';

function App() {
  const [modalContent, setModalContent] = useState(null);
  const [history, setHistory] = useState([]);
  const [prompts, setPrompts] = useState({});
  const [substitutes, setSubstitutes] = useState({});
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [currentView, setCurrentView] = useState('cli');
  const [chatMessages, setChatMessages] = useState([]);
  const [currentPromptSheet, setCurrentPromptSheet] = useState(null);
  const [settings, setSettings] = useState({
    aiModel: 'claude-3-5-sonnet-20241022',
    systemInstructions: 'You are a helpful AI assistant.',
    rootFolderPath: './storage',
    'prompt-sheet': null
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+P for Prompts Manager
      if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        openPromptsManager();
      }
      // Ctrl+S for Substitutes Manager
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        openSubstitutesManager();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompts, substitutes]);

  const loadData = async () => {
    try {
      const [promptsRes, substitutesRes, settingsRes] = await Promise.all([
        fetch(`${config.apiUrl}/api/prompts`),
        fetch(`${config.apiUrl}/api/substitutes`),
        fetch(`${config.apiUrl}/api/settings`)
      ]);

      if (promptsRes.ok) {
        const promptsData = await promptsRes.json();
        setPrompts(promptsData);
      }

      if (substitutesRes.ok) {
        const substitutesData = await substitutesRes.json();
        setSubstitutes(substitutesData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
        
        // Load the saved prompt sheet if it exists
        if (settingsData['prompt-sheet']) {
          loadPromptSheet(settingsData['prompt-sheet']);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadPromptSheet = async (sheetName) => {
    if (!sheetName) {
      // Load default prompts
      loadData();
      setCurrentPromptSheet(null);
      // Save the selection to settings
      await savePromptSheetToSettings(null);
      return;
    }

    try {
      const response = await fetch(`${config.apiUrl}/api/prompt-sheets/${sheetName}`);
      if (response.ok) {
        const sheetData = await response.json();
        setPrompts(sheetData.prompts || {});
        setCurrentPromptSheet(sheetName);
        // Save the selection to settings
        await savePromptSheetToSettings(sheetName);
      } else {
        console.error('Failed to load prompt sheet:', sheetName);
      }
    } catch (error) {
      console.error('Error loading prompt sheet:', error);
    }
  };

  const savePrompts = async (newPrompts) => {
    try {
      let response;
      if (currentPromptSheet) {
        // Save to specific prompt sheet
        response = await fetch(`${config.apiUrl}/api/prompt-sheets/${currentPromptSheet}/prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPrompts)
        });
      } else {
        // Save to default prompts.json
        response = await fetch(`${config.apiUrl}/api/prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPrompts)
        });
      }
      
      if (response.ok) {
        setPrompts(newPrompts);
        return true;
      }
    } catch (error) {
      console.error('Error saving prompts:', error);
    }
    return false;
  };

  const saveIndividualPrompt = async (promptName, content) => {
    const updatedPrompts = {
      ...prompts,
      [promptName]: content
    };
    return await savePrompts(updatedPrompts);
  };

  const openPromptsManager = () => {
    setModalContent(
      <PromptsManager 
        prompts={prompts}
        onSave={savePrompts}
        onClose={() => setModalContent(null)}
        reservedCommands={['restart', 'prompts', 'subs', 'system', 'ai-model', 'root', 'prompt-sheet', 'create-sheet', 'delete-sheet', 'diff']}
        currentPromptSheet={currentPromptSheet}
      />
    );
  };

  const openSubstitutesManager = () => {
    setModalContent(
      <SubstitutesManager
        substitutes={substitutes}
        onSave={saveSubstitutes}
        onClose={() => setModalContent(null)}
      />
    );
  };

  const saveSubstitutes = async (newSubstitutes) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/substitutes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubstitutes)
      });
      if (response.ok) {
        setSubstitutes(newSubstitutes);
        return true;
      }
    } catch (error) {
      console.error('Error saving substitutes:', error);
    }
    return false;
  };

  const saveSettings = async (newSettings) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        setSettings(newSettings);
        return true;
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    return false;
  };

  const savePromptSheetToSettings = async (sheetName) => {
    const updatedSettings = {
      ...settings,
      'prompt-sheet': sheetName
    };
    return await saveSettings(updatedSettings);
  };

  const handleCommand = (command) => {
    const newHistory = [...history, { type: 'command', content: command, timestamp: Date.now() }];
    setHistory(newHistory);

    // Handle system commands with single slash
    if (command === '/restart') {
      setHistory([]);
      setCurrentView('cli');
      setModalContent(null);
      setChatMessages([]);
      return;
    }

    if (command === '/prompts') {
      openPromptsManager();
      return;
    }

    if (command === '/subs') {
      setModalContent(
        <SubstitutesManager
          substitutes={substitutes}
          onSave={saveSubstitutes}
          onClose={() => setModalContent(null)}
        />
      );
      return;
    }

    if (command === '/system') {
      setModalContent(
        <SystemSettings
          settings={settings}
          onSave={saveSettings}
          onClose={() => setModalContent(null)}
        />
      );
      return;
    }

    if (command === '/ai-model') {
      setModalContent(
        <AIModelSettings
          settings={settings}
          onSave={saveSettings}
          onClose={() => setModalContent(null)}
        />
      );
      return;
    }

    if (command === '/root') {
      setModalContent(
        <RootFolderSettings
          settings={settings}
          onSave={saveSettings}
          onClose={() => setModalContent(null)}
        />
      );
      return;
    }

    if (command === '/prompt-sheet') {
      setModalContent(
        <PromptSheetSelector
          currentSheet={currentPromptSheet}
          onSelectSheet={loadPromptSheet}
          onClose={() => setModalContent(null)}
        />
      );
      return;
    }

    if (command === '/create-sheet') {
      setModalContent(
        <PromptSheetCreator
          onClose={() => setModalContent(null)}
          onSuccess={(sheetName) => {
            loadPromptSheet(sheetName);
          }}
        />
      );
      return;
    }

    if (command === '/delete-sheet') {
      setModalContent(
        <PromptSheetDeleter
          onClose={() => setModalContent(null)}
          onSuccess={(deletedSheet) => {
            // If we deleted the current sheet, switch to default
            if (deletedSheet === currentPromptSheet) {
              loadPromptSheet(null);
            }
          }}
        />
      );
      return;
    }

    if (command === '/diff') {
      setModalContent(
        <DiffReviewer
          onClose={() => setModalContent(null)}
        />
      );
      return;
    }

    // Check if it's a prompt name with double slash
    if (command.startsWith('//') && prompts[command.substring(2)]) {
      const promptName = command.substring(2);
      setCurrentPrompt(promptName);
      setModalContent(
        <PromptPreview
          promptName={promptName}
          promptContent={prompts[promptName]}
          substitutes={substitutes}
          settings={settings}
          prompts={prompts}
          onClose={() => setModalContent(null)}
          onSavePrompt={saveIndividualPrompt}
          onOpenPromptsManager={openPromptsManager}
          onOpenSubstitutesManager={openSubstitutesManager}
          onOpenChat={(renderedContent) => {
            setModalContent(
              <AIChat
                initialPrompt={renderedContent}
                settings={settings}
                onClose={() => setModalContent(null)}
              />
            );
          }}
        />
      );
      return;
    }

    // Handle raw text input (no slash)
    if (!command.startsWith('/')) {
      setModalContent(
        <PromptPreview
          promptName="Raw Input"
          promptContent={command}
          substitutes={substitutes}
          settings={settings}
          prompts={prompts}
          onClose={() => setModalContent(null)}
          onSavePrompt={saveIndividualPrompt}
          onOpenPromptsManager={openPromptsManager}
          onOpenSubstitutesManager={openSubstitutesManager}
          onOpenChat={(renderedContent) => {
            setModalContent(
              <AIChat
                initialPrompt={renderedContent}
                settings={settings}
                onClose={() => setModalContent(null)}
              />
            );
          }}
        />
      );
      return;
    }

    // Unknown command
    const errorHistory = [...newHistory, { 
      type: 'error', 
      content: `Unknown command: ${command}`, 
      timestamp: Date.now() 
    }];
    setHistory(errorHistory);
  };

  const getSuggestions = (input) => {
    const commands = ['restart', 'prompts', 'subs', 'system', 'ai-model', 'root', 'prompt-sheet', 'create-sheet', 'delete-sheet', 'diff'];
    const promptNames = Object.keys(prompts);

    if (!input.startsWith('/')) {
      return [];
    }

    // Handle double slash for prompts
    if (input.startsWith('//')) {
      const searchTerm = input.substring(2).toLowerCase();
      return promptNames
        .filter(cmd => cmd.toLowerCase().includes(searchTerm))
        .map(cmd => `//${cmd}`);
    }

    // Handle single slash for system commands
    if (input.startsWith('/')) {
      const searchTerm = input.substring(1).toLowerCase();
      return commands
        .filter(cmd => cmd.toLowerCase().includes(searchTerm))
        .map(cmd => `/${cmd}`);
    }

    return [];
  };

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text terminal">
      <CLI
        onCommand={handleCommand}
        history={history}
        getSuggestions={getSuggestions}
        currentPromptSheet={currentPromptSheet}
      />
      
      {modalContent && (
        <Modal onClose={() => setModalContent(null)}>
          {modalContent}
        </Modal>
      )}
    </div>
  );
}

export default App;
