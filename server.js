const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// Serve static files from storage directory
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Data directory setup
const DATA_DIR = process.env.DATA_DIR || './data';
fs.ensureDirSync(DATA_DIR);

// Initialize data files
const initializeDataFiles = async () => {
  const files = {
    prompts: path.join(DATA_DIR, 'prompts.json'),
    substitutes: path.join(DATA_DIR, 'substitutes.json'),
    settings: path.join(DATA_DIR, 'settings.json')
  };

  for (const [key, filePath] of Object.entries(files)) {
    if (!await fs.pathExists(filePath)) {
      let defaultData = {};
      if (key === 'settings') {
        defaultData = {
          aiModel: 'claude-3-5-sonnet-20241022',
          systemInstructions: 'You are a helpful AI assistant.',
          rootFolderPath: process.env.ROOT_FOLDER_PATH || './'
        };
      }
      await fs.writeJson(filePath, defaultData, { spaces: 2 });
      console.log(`Initialized ${filePath} with default data`);
    }
  }
};

// Utility functions for data management
const readJsonFile = async (filename) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    return await fs.readJson(filePath);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return {};
  }
};

const writeJsonFile = async (filename, data) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeJson(filePath, data, { spaces: 2 });
    console.log(`Successfully wrote to ${filename}`);
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
};

// API Routes

// Get all prompts
app.get('/api/prompts', async (req, res) => {
  try {
    const prompts = await readJsonFile('prompts.json');
    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// Save prompts
app.post('/api/prompts', async (req, res) => {
  try {
    const success = await writeJsonFile('prompts.json', req.body);
    if (success) {
      res.json({ message: 'Prompts saved successfully' });
    } else {
      res.status(500).json({ error: 'Failed to save prompts' });
    }
  } catch (error) {
    console.error('Error saving prompts:', error);
    res.status(500).json({ error: 'Failed to save prompts' });
  }
});

// Get all substitutes
app.get('/api/substitutes', async (req, res) => {
  try {
    const substitutes = await readJsonFile('substitutes.json');
    res.json(substitutes);
  } catch (error) {
    console.error('Error fetching substitutes:', error);
    res.status(500).json({ error: 'Failed to fetch substitutes' });
  }
});

// Save substitutes
app.post('/api/substitutes', async (req, res) => {
  try {
    const success = await writeJsonFile('substitutes.json', req.body);
    if (success) {
      res.json({ message: 'Substitutes saved successfully' });
    } else {
      res.status(500).json({ error: 'Failed to save substitutes' });
    }
  } catch (error) {
    console.error('Error saving substitutes:', error);
    res.status(500).json({ error: 'Failed to save substitutes' });
  }
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readJsonFile('settings.json');
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Save settings
app.post('/api/settings', async (req, res) => {
  try {
    const success = await writeJsonFile('settings.json', req.body);
    if (success) {
      res.json({ message: 'Settings saved successfully' });
    } else {
      res.status(500).json({ error: 'Failed to save settings' });
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Read file endpoint for substitutions
app.post('/api/read-file', async (req, res) => {
  try {
    const { filePath } = req.body;
    const settings = await readJsonFile('settings.json');
    const rootPath = settings.rootFolderPath || './';
    
    // Handle wildcard patterns
    if (filePath.includes('*')) {
      return res.json({ 
        content: `[WILDCARD NOT SUPPORTED: ${filePath}]`,
        error: `Wildcard patterns not supported: ${filePath}`
      });
    }
    
    const fullPath = path.resolve(rootPath, filePath);
    
    // Security check - ensure file is within root directory
    if (!fullPath.startsWith(path.resolve(rootPath))) {
      return res.json({ 
        content: `[ACCESS DENIED: ${filePath}]`,
        error: `Access denied: File outside root directory`
      });
    }
    
    // Check if file exists and is readable
    if (!await fs.pathExists(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      return res.json({ 
        content: `[FILE NOT FOUND: ${filePath}]`,
        error: `File not found: ${filePath}`
      });
    }
    
    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      // If it's a directory, return a helpful message
      if (stats.isDirectory()) {
        return res.json({ 
          content: `[DIRECTORY: ${filePath}]`,
          error: `Path is a directory, not a file: ${filePath}`
        });
      }
      return res.json({ 
        content: `[NOT A FILE: ${filePath}]`,
        error: `Path is not a file: ${filePath}`
      });
    }
    
    // Check file extension
    const ext = path.extname(fullPath).toLowerCase();
    if (!['.md', '.txt'].includes(ext)) {
      return res.json({ 
        content: `[UNSUPPORTED FILE TYPE: ${ext}]`,
        error: `Unsupported file type: ${ext}`
      });
    }
    
    const content = await fs.readFile(fullPath, 'utf8');
    res.json({ content, filePath });
  } catch (error) {
    console.error('Error reading file:', error);
    res.json({ 
      content: `[ERROR READING FILE: ${req.body.filePath}]`,
      error: error.message
    });
  }
});

// AI Chat endpoint with Server-Sent Events
app.post('/api/chat', async (req, res) => {
  try {
    const { message, systemInstructions, conversationHistory } = req.body;
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Anthropic API key not configured' });
    }
    
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    const settings = await readJsonFile('settings.json');
    const model = settings.aiModel || 'claude-3-5-sonnet-20241022';
    
    // Build messages array with conversation history + current message
    let messages = [];
    
    if (conversationHistory && conversationHistory.length > 0) {
      // Use the full conversation history
      messages = [...conversationHistory];
      // Add current message if it's not already the last message
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.content !== message) {
        messages.push({ role: 'user', content: message });
      }
    } else {
      // No history, just current message
      messages = [{ role: 'user', content: message }];
    }
    
    try {
      const stream = await anthropic.messages.create({
        model: model,
        max_tokens: 4000,
        system: systemInstructions || settings.systemInstructions || 'You are a helpful AI assistant.',
        messages: messages,
        stream: true,
      });
      
      for await (const messageStreamEvent of stream) {
        if (messageStreamEvent.type === 'content_block_delta') {
          const chunk = messageStreamEvent.delta.text;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      }
      
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (aiError) {
      console.error('AI API Error:', aiError);
      res.write(`data: ${JSON.stringify({ error: aiError.message })}\n\n`);
    }
    
    res.end();
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// Serve React app for all other routes (only in production)
app.get('*', (req, res) => {
  const buildPath = path.join(__dirname, 'client/build', 'index.html');
  if (fs.existsSync(buildPath)) {
    res.sendFile(buildPath);
  } else {
    // In development, React dev server handles this
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ 
        error: 'Production build not found. Run "npm run build" first.' 
      });
    } else {
      res.status(404).json({ 
        error: 'Development mode: React dev server should handle this on port 3000' 
      });
    }
  }
});

// Start server
const startServer = async () => {
  await initializeDataFiles();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer().catch(console.error);
