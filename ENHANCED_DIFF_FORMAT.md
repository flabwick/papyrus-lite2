# Enhanced Diff Format for Papyrus-Lite2

## Overview

The papyrus-lite2 diff module now supports an enhanced format that includes file path specifications and improved file content labeling for AI context.

## File Content Labeling

When using `{{path/to/file.md}}` substitutions in prompts, files are now wrapped with clear labels:

```
=== FILE: path/to/file.md ===
[file content here]
=== END FILE: path/to/file.md ===
```

This provides clear boundaries for AI models to understand where files start and end, and what files they are processing.

## Enhanced Diff Format

### Basic Structure

```markdown
<!-- File: path/to/target/file.ext -->
<!-- Change: Description of what this change does -->
```diff
<<<<<<< ORIGINAL
original text to be replaced
=======
new text to replace with
>>>>>>> PROPOSED
```
```

### Format Components

1. **File Path Comment** (optional): `<!-- File: path/to/file.ext -->`
   - Specifies which file this diff targets
   - Enables automatic file selection in the diff reviewer
   - Path should be relative to the project root

2. **Change Description** (optional): `<!-- Change: description -->`
   - Human-readable description of what the change does
   - Displayed as the diff block title

3. **Diff Block**: Standard git-style conflict markers
   - `<<<<<<< ORIGINAL` - marks start of original text
   - `=======` - separates original from proposed
   - `>>>>>>> PROPOSED` - marks end of proposed text

### Examples

#### Simple File Edit
```markdown
<!-- File: src/components/Header.js -->
<!-- Change: Update component title -->
```diff
<<<<<<< ORIGINAL
<h1>Old Title</h1>
=======
<h1>New Title</h1>
>>>>>>> PROPOSED
```
```

#### Multiple Changes to Same File
```markdown
<!-- File: src/utils/helpers.js -->
<!-- Change: Add new utility function -->
```diff
<<<<<<< ORIGINAL

=======
export const newUtility = (input) => {
  return input.toUpperCase();
};
>>>>>>> PROPOSED
```

<!-- File: src/utils/helpers.js -->
<!-- Change: Update existing function -->
```diff
<<<<<<< ORIGINAL
export const oldFunction = (data) => {
  return data.toLowerCase();
};
=======
export const oldFunction = (data) => {
  return data.toLowerCase().trim();
};
>>>>>>> PROPOSED
```
```

#### Addition Only (empty original)
```markdown
<!-- File: src/config.js -->
<!-- Change: Add new configuration option -->
```diff
<<<<<<< ORIGINAL

=======
export const NEW_FEATURE_ENABLED = true;
>>>>>>> PROPOSED
```
```

#### Deletion Only (empty proposed)
```markdown
<!-- File: src/deprecated.js -->
<!-- Change: Remove deprecated function -->
```diff
<<<<<<< ORIGINAL
// This function is deprecated
export const oldFunction = () => {
  console.log('deprecated');
};
=======

>>>>>>> PROPOSED
```
```

## Diff Reviewer Features

### Automatic File Selection
- When all diff blocks target the same file, it's automatically selected
- Files specified in diffs appear first in the dropdown with 🎯 indicator

### File Path Display
- Each diff block shows its target file path with 📁 icon
- File paths are displayed prominently above the change description

### Enhanced File Dropdown
- Files from diff blocks shown first: `🎯 path/to/file.ext (from diff)`
- Other available files listed below
- Clear visual distinction between targeted and available files

## Workflow

1. **Generate Diffs**: AI creates diffs in the enhanced format with file paths
2. **Parse**: Paste into diff reviewer, which extracts file paths and descriptions
3. **Auto-Select**: If all diffs target one file, it's automatically selected
4. **Review**: Accept/decline individual changes with file context visible
5. **Apply**: Changes applied to the correct target file automatically

## Benefits

- **Clear File Context**: AI knows exactly which files it's processing
- **Automatic Targeting**: No manual file selection needed for single-file diffs
- **Better Organization**: Multiple files can be edited in one diff session
- **Reduced Errors**: File paths prevent applying changes to wrong files
- **Improved AI Context**: File boundaries help AI understand content structure

## Migration from Old Format

Old format (still supported):
```markdown
<!-- Change: description -->
```diff
<<<<<<< ORIGINAL
old text
=======
new text
>>>>>>> PROPOSED
```
```

New enhanced format:
```markdown
<!-- File: path/to/file.ext -->
<!-- Change: description -->
```diff
<<<<<<< ORIGINAL
old text
=======
new text
>>>>>>> PROPOSED
```
```

The old format works but requires manual file selection. The new format enables automatic file targeting and better organization.
