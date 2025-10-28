/**
 * Parses diff blocks from markdown diff format
 * Expected format:
 * <!-- File: path/to/file.ext -->
 * <!-- Change: description -->
 * ```diff
 * <<<<<<< ORIGINAL
 * original text
 * =======
 * new text
 * >>>>>>> PROPOSED
 * ```
 */

export const parseDiffBlocks = (content) => {
  const diffBlocks = [];
  
  // Enhanced regex to match diff blocks with optional file path and change comments
  const diffBlockRegex = /(?:<!--\s*File:\s*([^>]*)\s*-->\s*)?(?:<!--\s*Change:\s*([^>]*)\s*-->\s*)?```diff\s*\n<<<<<<< ORIGINAL\s*\n([\s\S]*?)\n=======\s*\n([\s\S]*?)\n>>>>>>> PROPOSED\s*\n```/g;
  
  let match;
  let blockIndex = 0;
  
  while ((match = diffBlockRegex.exec(content)) !== null) {
    const [fullMatch, filePath, description, original, proposed] = match;
    
    diffBlocks.push({
      id: `diff-${blockIndex}`,
      filePath: filePath ? filePath.trim() : null,
      description: description ? description.trim() : `Change ${blockIndex + 1}`,
      original: original || '',
      proposed: proposed || '',
      status: 'pending', // pending, accepted, declined
      isEditing: false
    });
    
    blockIndex++;
  }
  
  return diffBlocks;
};

/**
 * Applies accepted diff changes to the original content
 */
export const applyDiffChanges = (originalContent, diffBlocks) => {
  let modifiedContent = originalContent;
  
  // Sort by position in reverse order to maintain correct indices
  const acceptedBlocks = diffBlocks
    .filter(block => block.status === 'accepted')
    .sort((a, b) => {
      // Find position of original text in content
      const posA = modifiedContent.lastIndexOf(a.original);
      const posB = modifiedContent.lastIndexOf(b.original);
      return posB - posA; // Reverse order
    });
  
  for (const block of acceptedBlocks) {
    if (block.original === '') {
      // Addition only - find a good insertion point
      // For now, append to end (could be improved with better heuristics)
      modifiedContent += '\n' + block.proposed;
    } else if (block.proposed === '') {
      // Deletion only
      modifiedContent = modifiedContent.replace(block.original, '');
    } else {
      // Replacement
      const index = modifiedContent.lastIndexOf(block.original);
      if (index !== -1) {
        modifiedContent = 
          modifiedContent.substring(0, index) + 
          block.proposed + 
          modifiedContent.substring(index + block.original.length);
      }
    }
  }
  
  return modifiedContent;
};

/**
 * Validates that a diff block's original text exists in the content
 */
export const validateDiffBlock = (originalContent, diffBlock) => {
  if (diffBlock.original === '') {
    return { valid: true, message: 'Addition block' };
  }
  
  const found = originalContent.includes(diffBlock.original);
  return {
    valid: found,
    message: found ? 'Original text found' : 'Original text not found in content'
  };
};
