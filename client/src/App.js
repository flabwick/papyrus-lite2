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
import config from './config';

function App() {
  const [modalContent, setModalContent] = useState(null);
  const [history, setHistory] = useState([]);
  const [prompts, setPrompts] = useState({});
  const [substitutes, setSubstitutes] = useState({});
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [currentView, setCurrentView] = useState('cli');
  const [chatMessages, setChatMessages] = useState([]);
  const [settings, setSettings] = useState({
    aiModel: 'claude-3-5-sonnet-20241022',
    systemInstructions: 'You are a helpful AI assistant.',
    rootFolderPath: './'
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

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
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const savePrompts = async (newPrompts) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrompts)
      });
      if (response.ok) {
        setPrompts(newPrompts);
        return true;
      }
    } catch (error) {
      console.error('Error saving prompts:', error);
    }
    return false;
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

  const handleCommand = (command) => {
    const newHistory = [...history, { type: 'command', content: command, timestamp: Date.now() }];
    setHistory(newHistory);

    // Handle different commands
    if (command === '/restart') {
      setHistory([]);
      setCurrentView('cli');
      setModalContent(null);
      setChatMessages([]);
      return;
    }

    if (command === '/prompts') {
      setModalContent(
        <PromptsManager 
          prompts={prompts}
          onSave={savePrompts}
          onClose={() => setModalContent(null)}
          reservedCommands={['restart', 'prompts', 'subs', 'system', 'ai-model', 'root']}
        />
      );
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

    // Check if it's a prompt name
    if (command.startsWith('/') && prompts[command.substring(1)]) {
      const promptName = command.substring(1);
      setCurrentPrompt(promptName);
      setModalContent(
        <PromptPreview
          promptName={promptName}
          promptContent={prompts[promptName]}
          substitutes={substitutes}
          settings={settings}
          onClose={() => setModalContent(null)}
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
          onClose={() => setModalContent(null)}
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
    const commands = ['restart', 'prompts', 'subs', 'system', 'ai-model', 'root'];
    const promptNames = Object.keys(prompts);
    const allSuggestions = [...commands, ...promptNames];

    if (!input.startsWith('/')) {
      return [];
    }

    const searchTerm = input.substring(1).toLowerCase();
    return allSuggestions
      .filter(cmd => cmd.toLowerCase().includes(searchTerm))
      .map(cmd => `/${cmd}`);
  };

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text terminal">
      <CLI
        onCommand={handleCommand}
        history={history}
        getSuggestions={getSuggestions}
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
