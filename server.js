const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { glob } = require('glob');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'client/build')));

// Serve static files from storage directory
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Data directory setup
const DATA_DIR = process.env.DATA_DIR || './data';

// Utility functions for data management
const readJsonFile = async (filename) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    return await fs.readJson(filePath);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    
    // Return appropriate defaults for different files
    if (filename === 'settings.json') {
      return {
        aiModel: 'claude-3-5-sonnet-20241022',
        systemInstructions: 'You are a helpful AI assistant.',
        rootFolderPath: process.env.ROOT_FOLDER_PATH || './storage',
        'prompt-sheet': null
      };
    }
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

// Initialize settings file with defaults if it doesn't exist
const initializeSettings = async () => {
  try {
    const settingsPath = path.join(DATA_DIR, 'settings.json');
    const exists = await fs.pathExists(settingsPath);
    
    if (!exists) {
      const defaultSettings = {
        aiModel: 'claude-3-5-sonnet-20241022',
        systemInstructions: 'You are a helpful AI assistant.',
        rootFolderPath: process.env.ROOT_FOLDER_PATH || './storage',
        'prompt-sheet': null
      };
      
      await writeJsonFile('settings.json', defaultSettings);
      console.log('Initialized settings.json with default values');
    }
  } catch (error) {
    console.error('Error initializing settings:', error);
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

// Get available prompt sheets
app.get('/api/prompt-sheets', async (req, res) => {
  try {
    const promptSheets = await getAvailablePromptSheets();
    res.json(promptSheets);
  } catch (error) {
    console.error('Error fetching prompt sheets:', error);
    res.status(500).json({ error: 'Failed to fetch prompt sheets' });
  }
});

// Get specific prompt sheet
app.get('/api/prompt-sheets/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const sheetData = await getPromptSheet(sheetName);
    if (sheetData) {
      res.json(sheetData);
    } else {
      res.status(404).json({ error: 'Prompt sheet not found' });
    }
  } catch (error) {
    console.error('Error fetching prompt sheet:', error);
    res.status(500).json({ error: 'Failed to fetch prompt sheet' });
  }
});

// Create new prompt sheet
app.post('/api/prompt-sheets', async (req, res) => {
  try {
    const { name, description, prompts } = req.body;
    const result = await createPromptSheet(name, description, prompts || {});
    if (result.success) {
      res.json({ message: 'Prompt sheet created successfully', name });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error creating prompt sheet:', error);
    res.status(500).json({ error: 'Failed to create prompt sheet' });
  }
});

// Delete prompt sheet
app.delete('/api/prompt-sheets/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const result = await deletePromptSheet(sheetName);
    if (result.success) {
      res.json({ message: 'Prompt sheet deleted successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error deleting prompt sheet:', error);
    res.status(500).json({ error: 'Failed to delete prompt sheet' });
  }
});

// Save prompts to specific sheet
app.post('/api/prompt-sheets/:sheetName/prompts', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const prompts = req.body;
    const result = await savePromptsToSheet(sheetName, prompts);
    if (result.success) {
      res.json({ message: 'Prompts saved successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error saving prompts to sheet:', error);
    res.status(500).json({ error: 'Failed to save prompts to sheet' });
  }
});

// Validate link endpoint for link analysis
app.post('/api/validate-link', async (req, res) => {
  try {
    const { linkData, rootPath } = req.body;
    const actualRootPath = rootPath || process.env.ROOT_FOLDER_PATH || './storage';
    
    const result = await validateLinkData(linkData, actualRootPath);
    res.json(result);
  } catch (error) {
    console.error('Error validating link:', error);
    res.json({
      error: error.message,
      isValid: false,
      wordCount: 0,
      tokenCount: 0
    });
  }
});

// Read file endpoint for substitutions with advanced linking
app.post('/api/read-file', async (req, res) => {
  try {
    const { filePath } = req.body;
    const rootPath = process.env.ROOT_FOLDER_PATH || './storage';
    
    // Parse the link content to separate path and heading selector
    const parsed = parseLinkContent(filePath);
    
    let content;
    if (parsed.hasWildcard) {
      content = await resolveWildcardLink(parsed, rootPath);
    } else {
      content = await resolveSingleFileLink(parsed, rootPath);
    }
    
    res.json({ content, filePath });
  } catch (error) {
    console.error('Error reading file:', error);
    res.json({ 
      content: `[ERROR READING FILE: ${req.body.filePath}] - ${error.message}`,
      error: error.message
    });
  }
});

// Helper functions for advanced file linking
function parseLinkContent(linkContent) {
  // Handle quotes and escaping first
  const unescaped = unescapeSpecialChars(linkContent);
  
  // Split on # to separate path from heading selector
  const hashIndex = unescaped.indexOf('#');
  let filePath, headingSelector;
  
  if (hashIndex === -1) {
    filePath = unescaped;
    headingSelector = null;
  } else {
    filePath = unescaped.substring(0, hashIndex);
    headingSelector = unescaped.substring(hashIndex + 1);
  }
  
  // Determine if this is a wildcard pattern
  const hasWildcard = filePath.includes('*');
  const isRecursive = filePath.includes('**');
  
  return {
    original: linkContent,
    filePath: filePath.trim(),
    headingSelector: headingSelector ? headingSelector.trim() : null,
    hasWildcard,
    isRecursive
  };
}

function unescapeSpecialChars(content) {
  // Handle quoted strings
  if (content.startsWith('"') && content.endsWith('"')) {
    return content.slice(1, -1);
  }
  
  // Handle escaped characters
  return content.replace(/\\(.)/g, '$1');
}

async function resolveWildcardLink(parsed, rootPath) {
  // Convert wildcard pattern to glob pattern
  let globPattern;
  if (path.isAbsolute(parsed.filePath)) {
    globPattern = parsed.filePath;
  } else {
    globPattern = path.join(rootPath, parsed.filePath);
  }

  // Find matching files
  const matchingFiles = await findMatchingFiles(globPattern);
  
  if (matchingFiles.length === 0) {
    return `[No files found matching pattern: ${parsed.filePath}]`;
  }

  // Process each file
  const results = [];
  for (const filePath of matchingFiles) {
    try {
      const fileContent = await readAndProcessFile(filePath, parsed.headingSelector);
      const relativePath = path.relative(rootPath, filePath);
      results.push(`\n=== FILE: ${relativePath} ===\n${fileContent}\n=== END FILE: ${relativePath} ===`);
    } catch (error) {
      const relativePath = path.relative(rootPath, filePath);
      results.push(`\n=== FILE: ${relativePath} ===\n[Error: ${error.message}]\n=== END FILE: ${relativePath} ===`);
    }
  }

  return results.join('\n');
}

async function resolveSingleFileLink(parsed, rootPath) {
  let filePath;
  if (path.isAbsolute(parsed.filePath)) {
    filePath = parsed.filePath;
  } else {
    filePath = path.resolve(rootPath, parsed.filePath);
  }

  // Security check
  const normalizedRoot = path.resolve(rootPath);
  const normalizedFile = path.resolve(filePath);
  if (!normalizedFile.startsWith(normalizedRoot)) {
    throw new Error(`File path outside root directory: ${parsed.filePath}`);
  }

  // Check if file exists
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File not found: ${parsed.filePath}`);
  }

  // Process the file with labels
  const fileContent = await readAndProcessFile(filePath, parsed.headingSelector);
  const relativePath = path.relative(rootPath, filePath);
  
  // Add file labels (header and footer)
  return `=== FILE: ${relativePath} ===\n${fileContent}\n=== END FILE: ${relativePath} ===`;
}

async function findMatchingFiles(globPattern) {
  try {
    const files = await glob(globPattern, { nodir: true });
    // Filter for supported file types
    const supportedFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.md', '.txt'].includes(ext);
    }).sort();
    return supportedFiles;
  } catch (err) {
    throw err;
  }
}

async function readAndProcessFile(filePath, headingSelector) {
  // Check file extension
  const ext = path.extname(filePath).toLowerCase();
  if (!['.md', '.txt'].includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  // Read file content
  const fileContent = await fs.readFile(filePath, 'utf8');
  
  // If no heading selector, return entire file
  if (!headingSelector) {
    return fileContent;
  }

  // Process heading selector
  return extractHeadingContent(fileContent, headingSelector);
}

function extractHeadingContent(fileContent, headingSelector) {
  // Parse different types of heading selectors
  const selector = parseHeadingSelector(headingSelector);
  
  // Extract headings from content
  const headings = parseHeadings(fileContent);
  
  if (headings.length === 0) {
    return '[No headings found in file]';
  }
  
  // Apply selector logic
  return applyHeadingSelector(fileContent, headings, selector);
}

function parseHeadingSelector(selector) {
  // Handle case-insensitive prefix
  let caseInsensitive = false;
  let actualSelector = selector;
  if (selector.startsWith('i:')) {
    caseInsensitive = true;
    actualSelector = selector.substring(2);
  }

  // Handle regex patterns
  if (actualSelector.startsWith('/') && actualSelector.endsWith('/')) {
    return {
      type: 'regex',
      pattern: actualSelector.slice(1, -1),
      caseInsensitive
    };
  }

  // Handle level selectors (=2, =2-4, =2:Heading)
  if (actualSelector.startsWith('=')) {
    return parseLevelSelector(actualSelector, caseInsensitive);
  }

  // Handle ranges (Start..End)
  if (actualSelector.includes('..')) {
    const [start, end] = actualSelector.split('..');
    return {
      type: 'range',
      start: start.trim(),
      end: end.trim(),
      caseInsensitive
    };
  }

  // Handle multiple headings (One,Two,Three)
  if (actualSelector.includes(',')) {
    return {
      type: 'multiple',
      headings: actualSelector.split(',').map(h => h.trim()),
      caseInsensitive
    };
  }

  // Handle heading-only (Heading!)
  if (actualSelector.endsWith('!')) {
    return {
      type: 'heading-only',
      heading: actualSelector.slice(0, -1).trim(),
      caseInsensitive
    };
  }

  // Default: single heading with nested content
  return {
    type: 'single',
    heading: actualSelector,
    caseInsensitive
  };
}

function parseLevelSelector(selector, caseInsensitive) {
  const levelPart = selector.substring(1); // Remove =
  
  // Handle level with heading constraint (=2:Heading)
  if (levelPart.includes(':')) {
    const [levelSpec, heading] = levelPart.split(':', 2);
    const levels = parseLevelSpec(levelSpec);
    return {
      type: 'level-constrained',
      levels,
      heading: heading.trim(),
      caseInsensitive
    };
  }
  
  // Handle level range or single level
  const levels = parseLevelSpec(levelPart);
  return {
    type: 'level',
    levels,
    caseInsensitive
  };
}

function parseLevelSpec(levelSpec) {
  if (levelSpec.includes('-')) {
    const [start, end] = levelSpec.split('-').map(n => parseInt(n.trim()));
    return { min: start, max: end };
  } else {
    const level = parseInt(levelSpec.trim());
    return { min: level, max: level };
  }
}

function parseHeadings(content) {
  const lines = content.split('\n');
  const headings = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        lineIndex: i,
        fullLine: line
      });
    }
  }
  
  return headings;
}

function applyHeadingSelector(fileContent, headings, selector) {
  const lines = fileContent.split('\n');
  
  switch (selector.type) {
    case 'single':
      return extractSingleHeading(lines, headings, selector);
    case 'heading-only':
      return extractHeadingOnly(lines, headings, selector);
    case 'level':
      return extractByLevel(lines, headings, selector);
    case 'level-constrained':
      return extractByLevelConstrained(lines, headings, selector);
    case 'range':
      return extractByRange(lines, headings, selector);
    case 'multiple':
      return extractMultipleHeadings(lines, headings, selector);
    case 'regex':
      return extractByRegex(lines, headings, selector);
    default:
      return '[Unknown selector type]';
  }
}

function extractSingleHeading(lines, headings, selector) {
  const heading = findHeading(headings, selector.heading, selector.caseInsensitive);
  if (!heading) {
    return `[Heading not found: ${selector.heading}]`;
  }
  
  return extractHeadingWithNested(lines, headings, heading);
}

function extractHeadingOnly(lines, headings, selector) {
  const heading = findHeading(headings, selector.heading, selector.caseInsensitive);
  if (!heading) {
    return `[Heading not found: ${selector.heading}]`;
  }
  
  // Find content until next heading of same or higher level
  const startLine = heading.lineIndex + 1;
  let endLine = lines.length;
  
  for (let i = 0; i < headings.length; i++) {
    const nextHeading = headings[i];
    if (nextHeading.lineIndex > heading.lineIndex && nextHeading.level <= heading.level) {
      endLine = nextHeading.lineIndex;
      break;
    }
  }
  
  return lines.slice(startLine, endLine).join('\n').trim();
}

function extractByLevel(lines, headings, selector) {
  const matchingHeadings = headings.filter(h => 
    h.level >= selector.levels.min && h.level <= selector.levels.max
  );
  
  if (matchingHeadings.length === 0) {
    return `[No headings found at level ${selector.levels.min}-${selector.levels.max}]`;
  }
  
  const results = [];
  for (const heading of matchingHeadings) {
    const content = extractHeadingWithNested(lines, headings, heading);
    results.push(content);
  }
  
  return results.join('\n\n');
}

function extractByLevelConstrained(lines, headings, selector) {
  const matchingHeadings = headings.filter(h => {
    const levelMatch = h.level >= selector.levels.min && h.level <= selector.levels.max;
    const textMatch = selector.caseInsensitive ? 
      h.text.toLowerCase().includes(selector.heading.toLowerCase()) :
      h.text.includes(selector.heading);
    return levelMatch && textMatch;
  });
  
  if (matchingHeadings.length === 0) {
    return `[No level ${selector.levels.min}-${selector.levels.max} headings found containing: ${selector.heading}]`;
  }
  
  const results = [];
  for (const heading of matchingHeadings) {
    const content = extractHeadingWithNested(lines, headings, heading);
    results.push(content);
  }
  
  return results.join('\n\n');
}

function extractByRange(lines, headings, selector) {
  const startHeading = findHeading(headings, selector.start, selector.caseInsensitive);
  const endHeading = findHeading(headings, selector.end, selector.caseInsensitive);
  
  if (!startHeading) {
    return `[Start heading not found: ${selector.start}]`;
  }
  if (!endHeading) {
    return `[End heading not found: ${selector.end}]`;
  }
  
  if (startHeading.lineIndex >= endHeading.lineIndex) {
    return `[Invalid range: start heading comes after end heading]`;
  }
  
  // Extract from start heading to end of end heading's content
  const endContent = extractHeadingWithNested(lines, headings, endHeading);
  const endContentLines = endContent.split('\n');
  const endLineIndex = endHeading.lineIndex + endContentLines.length;
  
  return lines.slice(startHeading.lineIndex, endLineIndex).join('\n').trim();
}

function extractMultipleHeadings(lines, headings, selector) {
  const results = [];
  
  for (const headingName of selector.headings) {
    const heading = findHeading(headings, headingName, selector.caseInsensitive);
    if (heading) {
      const content = extractHeadingWithNested(lines, headings, heading);
      results.push(content);
    } else {
      results.push(`[Heading not found: ${headingName}]`);
    }
  }
  
  return results.join('\n\n');
}

function extractByRegex(lines, headings, selector) {
  const flags = selector.caseInsensitive ? 'i' : '';
  const regex = new RegExp(selector.pattern, flags);
  
  const matchingHeadings = headings.filter(h => regex.test(h.text));
  
  if (matchingHeadings.length === 0) {
    return `[No headings found matching pattern: ${selector.pattern}]`;
  }
  
  const results = [];
  for (const heading of matchingHeadings) {
    const content = extractHeadingWithNested(lines, headings, heading);
    results.push(content);
  }
  
  return results.join('\n\n');
}

function findHeading(headings, searchText, caseInsensitive = false) {
  return headings.find(h => {
    if (caseInsensitive) {
      return h.text.toLowerCase() === searchText.toLowerCase();
    } else {
      return h.text === searchText;
    }
  });
}

function extractHeadingWithNested(lines, headings, targetHeading) {
  const startLine = targetHeading.lineIndex;
  let endLine = lines.length;
  
  // Find the next heading at the same or higher level
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    if (heading.lineIndex > targetHeading.lineIndex && heading.level <= targetHeading.level) {
      endLine = heading.lineIndex;
      break;
    }
  }
  
  return lines.slice(startLine, endLine).join('\n').trim();
}

// Link validation function
async function validateLinkData(linkData, rootPath) {
  try {
    let content = '';
    let matchedFiles = [];
    let wordCount = 0;
    let tokenCount = 0;

    if (linkData.isWildcard) {
      // Handle wildcard patterns
      let globPattern;
      if (path.isAbsolute(linkData.path)) {
        globPattern = linkData.path;
      } else {
        globPattern = path.join(rootPath, linkData.path);
      }

      matchedFiles = await findMatchingFiles(globPattern);
      
      if (matchedFiles.length === 0) {
        return {
          error: `No files found matching pattern: ${linkData.path}`,
          isValid: false,
          wordCount: 0,
          tokenCount: 0,
          matchedFiles: []
        };
      }

      // Process each matched file
      const results = [];
      for (const filePath of matchedFiles) {
        try {
          const fileContent = await readAndProcessFile(filePath, linkData.headingSelector);
          results.push(fileContent);
        } catch (error) {
          results.push(`[Error reading ${path.basename(filePath)}: ${error.message}]`);
        }
      }
      
      content = results.join('\n\n');
    } else {
      // Handle single file
      let filePath;
      if (path.isAbsolute(linkData.path)) {
        filePath = linkData.path;
      } else {
        filePath = path.resolve(rootPath, linkData.path);
      }

      // Security check
      const normalizedRoot = path.resolve(rootPath);
      const normalizedFile = path.resolve(filePath);
      if (!normalizedFile.startsWith(normalizedRoot)) {
        return {
          error: `File path outside root directory: ${linkData.path}`,
          isValid: false,
          wordCount: 0,
          tokenCount: 0
        };
      }

      // Check if file exists
      if (!await fs.pathExists(filePath)) {
        return {
          error: `File not found: ${linkData.path}`,
          isValid: false,
          wordCount: 0,
          tokenCount: 0
        };
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (!['.md', '.txt'].includes(ext)) {
        return {
          error: `Unsupported file type: ${ext}. Only .md and .txt files are supported.`,
          isValid: false,
          wordCount: 0,
          tokenCount: 0
        };
      }

      try {
        content = await readAndProcessFile(filePath, linkData.headingSelector);
        matchedFiles = [filePath];
      } catch (error) {
        return {
          error: error.message,
          isValid: false,
          wordCount: 0,
          tokenCount: 0
        };
      }
    }

    // Count words and estimate tokens
    if (content && !content.startsWith('[')) { // Don't count error messages
      wordCount = countWords(content);
      tokenCount = estimateTokens(content);
    }

    return {
      isValid: true,
      error: null,
      wordCount,
      tokenCount,
      matchedFiles,
      content
    };

  } catch (error) {
    return {
      error: error.message,
      isValid: false,
      wordCount: 0,
      tokenCount: 0
    };
  }
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function estimateTokens(text) {
  if (!text) return 0;
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Helper functions for prompt sheets
async function getAvailablePromptSheets() {
  try {
    const files = await fs.readdir(DATA_DIR);
    const promptSheets = [];
    
    for (const file of files) {
      // Look for files that match the pattern: prompts-[name].json
      const match = file.match(/^prompts-(.+)\.json$/);
      if (match) {
        const sheetName = match[1];
        const filePath = path.join(DATA_DIR, file);
        
        try {
          const sheetData = await fs.readJson(filePath);
          const promptCount = Object.keys(sheetData.prompts || sheetData || {}).length;
          
          promptSheets.push({
            name: sheetName,
            filename: file,
            promptCount,
            description: sheetData.description || null
          });
        } catch (error) {
          console.warn(`Error reading prompt sheet ${file}:`, error.message);
        }
      }
    }
    
    return promptSheets.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error scanning for prompt sheets:', error);
    return [];
  }
}

async function getPromptSheet(sheetName) {
  try {
    const filename = `prompts-${sheetName}.json`;
    const filePath = path.join(DATA_DIR, filename);
    
    if (!await fs.pathExists(filePath)) {
      return null;
    }
    
    const sheetData = await fs.readJson(filePath);
    
    // Handle different formats:
    // 1. { "prompts": { ... }, "description": "..." }
    // 2. { "prompt1": "content1", "prompt2": "content2" }
    if (sheetData.prompts) {
      // Format 1: structured with metadata
      return {
        name: sheetName,
        prompts: sheetData.prompts,
        description: sheetData.description || null
      };
    } else {
      // Format 2: flat prompt object
      return {
        name: sheetName,
        prompts: sheetData,
        description: null
      };
    }
  } catch (error) {
    console.error(`Error reading prompt sheet ${sheetName}:`, error);
    return null;
  }
}

async function createPromptSheet(name, description, prompts) {
  try {
    // Validate sheet name
    if (!name || typeof name !== 'string') {
      return { success: false, error: 'Sheet name is required' };
    }
    
    // Sanitize name (remove special characters, spaces)
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (sanitizedName !== name.toLowerCase()) {
      return { success: false, error: 'Sheet name can only contain letters, numbers, hyphens, and underscores' };
    }
    
    const filename = `prompts-${sanitizedName}.json`;
    const filePath = path.join(DATA_DIR, filename);
    
    // Check if sheet already exists
    if (await fs.pathExists(filePath)) {
      return { success: false, error: 'Prompt sheet already exists' };
    }
    
    // Create sheet data
    const sheetData = {
      description: description || null,
      prompts: prompts || {}
    };
    
    await fs.writeJson(filePath, sheetData, { spaces: 2 });
    console.log(`Created prompt sheet: ${filename}`);
    
    return { success: true };
  } catch (error) {
    console.error(`Error creating prompt sheet ${name}:`, error);
    return { success: false, error: error.message };
  }
}

async function deletePromptSheet(sheetName) {
  try {
    const filename = `prompts-${sheetName}.json`;
    const filePath = path.join(DATA_DIR, filename);
    
    // Check if sheet exists
    if (!await fs.pathExists(filePath)) {
      return { success: false, error: 'Prompt sheet not found' };
    }
    
    await fs.remove(filePath);
    console.log(`Deleted prompt sheet: ${filename}`);
    
    return { success: true };
  } catch (error) {
    console.error(`Error deleting prompt sheet ${sheetName}:`, error);
    return { success: false, error: error.message };
  }
}

async function savePromptsToSheet(sheetName, prompts) {
  try {
    const filename = `prompts-${sheetName}.json`;
    const filePath = path.join(DATA_DIR, filename);
    
    // Check if sheet exists
    if (!await fs.pathExists(filePath)) {
      return { success: false, error: 'Prompt sheet not found' };
    }
    
    // Read existing sheet data to preserve description
    const existingData = await fs.readJson(filePath);
    const sheetData = {
      description: existingData.description || null,
      prompts: prompts
    };
    
    await fs.writeJson(filePath, sheetData, { spaces: 2 });
    console.log(`Updated prompts in sheet: ${filename}`);
    
    return { success: true };
  } catch (error) {
    console.error(`Error saving prompts to sheet ${sheetName}:`, error);
    return { success: false, error: error.message };
  }
}

// File operations endpoints for diff reviewer
app.get('/api/files', async (req, res) => {
  try {
    const rootPath = process.env.ROOT_FOLDER_PATH || './storage';
    
    // Find all markdown and text files in the root directory
    const globPattern = path.join(rootPath, '**/*.{md,txt}');
    const files = await glob(globPattern, { nodir: true });
    
    // Return relative paths from root
    const relativeFiles = files.map(file => path.relative(rootPath, file));
    res.json(relativeFiles);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.get('/api/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const rootPath = process.env.ROOT_FOLDER_PATH || './storage';
    
    const filePath = path.resolve(rootPath, filename);
    
    // Security check
    const normalizedRoot = path.resolve(rootPath);
    const normalizedFile = path.resolve(filePath);
    if (!normalizedFile.startsWith(normalizedRoot)) {
      return res.status(403).json({ error: 'File path outside root directory' });
    }
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    res.type('text/plain').send(content);
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

app.put('/api/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const content = req.body;
    const rootPath = process.env.ROOT_FOLDER_PATH || './storage';
    
    const filePath = path.resolve(rootPath, filename);
    
    // Security check
    const normalizedRoot = path.resolve(rootPath);
    const normalizedFile = path.resolve(filePath);
    if (!normalizedFile.startsWith(normalizedRoot)) {
      return res.status(403).json({ error: 'File path outside root directory' });
    }
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(filePath));
    
    // Write file content
    await fs.writeFile(filePath, content, 'utf8');
    
    console.log(`File updated: ${filename}`);
    res.json({ message: 'File saved successfully' });
  } catch (error) {
    console.error('Error writing file:', error);
    res.status(500).json({ error: 'Failed to write file' });
  }
});

// AI Chat endpoint with Server-Sent Events
app.post('/api/chat', async (req, res) => {
  try {
    const { message, systemInstructions, conversationHistory } = req.body;
    
    const settings = await readJsonFile('settings.json');
    const model = settings.aiModel || 'claude-opus-4';
    
    // Determine which API to use based on model
    const isOpenAI = model.startsWith('gpt-');
    const isAnthropic = model.startsWith('claude-');
    
    if (isAnthropic && !process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Anthropic API key not configured' });
    }
    
    if (isOpenAI && !process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
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
      if (isAnthropic) {
        // Handle Anthropic models
        const Anthropic = require('@anthropic-ai/sdk');
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        
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
        
      } else if (isOpenAI) {
        // Handle OpenAI models
        const OpenAI = require('openai');
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        
        const stream = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemInstructions || settings.systemInstructions || 'You are a helpful AI assistant.'
            },
            ...messages
          ],
          stream: true,
          max_tokens: 4000,
        });
        
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
          }
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
  // Initialize settings with defaults if needed
  await initializeSettings();
  
  // Log available prompt sheets on startup
  const promptSheets = await getAvailablePromptSheets();
  if (promptSheets.length > 0) {
    console.log(`Found ${promptSheets.length} prompt sheet(s):`, promptSheets.map(s => s.name).join(', '));
  }
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer().catch(console.error);
