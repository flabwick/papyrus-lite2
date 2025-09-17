# Papyrus Lite 2 - CLI-based AI Prompt Management System

A terminal-style web application for managing AI prompts with file substitution and Claude integration.

## Features

- **CLI Interface**: Terminal-style command interface with autocomplete
- **Prompt Management**: Create, edit, and organize AI prompts
- **File Substitution**: Link to files and other prompts using `{{link-name}}` syntax
- **AI Integration**: Chat with Claude 3.5 Sonnet/Haiku with streaming responses
- **Export Functionality**: Export prompts and AI responses to markdown files
- **Persistent Storage**: All data saved to JSON files

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   cd client && npm install
   ```

2. **Set up Environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

3. **Run in Development**:
   ```bash
   # Terminal 1 - Backend server (port 3001)
   npm run dev
   
   # Terminal 2 - React dev server (port 3000)
   cd client && npm start
   ```

4. **Access the App**:
   - Development: http://localhost:3000
   - Production: http://localhost:3001 (after building)

## Commands

- `/restart` - Clear CLI history and reset
- `/prompts` - Manage prompts (add, edit, delete)
- `/subs` - Manage substitutes for file/content linking
- `/system` - Edit AI system instructions
- `/ai-model` - Select Claude model (Sonnet or Haiku)
- `/root` - Set root folder path for file links
- `/[prompt-name]` - Preview and run a specific prompt
- Raw text (no /) - Preview and process any text input

## File Substitution

Use `{{link-name}}` in prompts to substitute content:

- `{{file.md}}` - Include content from file.md
- `{{substitute-name}}` - Include content from a substitute
- Supports recursive substitution and relative paths

## Production Deployment

### For dev.jimboslice.xyz:

1. **Quick Deploy**:
   ```bash
   ./deploy.sh
   npm start
   ```

2. **Manual Deploy**:
   ```bash
   npm run install-all
   npm run build
   cp .env.production .env
   # Edit .env and add your ANTHROPIC_API_KEY
   npm start
   ```

3. **Nginx Configuration**:
   - Backend runs on port 3001 → api-dev.jimboslice.xyz
   - Frontend build served from port 4201 → dev.jimboslice.xyz
   - Your existing nginx configs will work perfectly

## Environment Variables

- `ANTHROPIC_API_KEY` - Your Claude API key (required)
- `PORT` - Server port (default: 4201)
- `NODE_ENV` - Environment (development/production)
- `DATA_DIR` - Data storage directory (default: ./data)
- `ROOT_FOLDER_PATH` - Default root folder for file links

## Data Storage

All data is stored in JSON files in the `./data` directory:
- `prompts.json` - User prompts
- `substitutes.json` - Content substitutes
- `settings.json` - App settings (AI model, system instructions, root path)

## Security

- File access restricted to .md and .txt files only
- Path traversal protection for file reading
- Files must be within the configured root directory
- No file upload/modification capabilities (read-only)

## Troubleshooting

**Server won't start**: Check that port 4201 is available
**AI not working**: Verify ANTHROPIC_API_KEY in .env file
**File links not working**: Check root folder path in /root command
**React build errors**: Delete node_modules and reinstall dependencies