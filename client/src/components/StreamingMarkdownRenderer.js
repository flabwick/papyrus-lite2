import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import config from '../config';

// Separate component for image rendering to comply with React Hooks rules
const MarkdownImage = ({ src, alt, title }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Handle relative paths by prepending the API base URL
  const resolvedSrc = useMemo(() => {
    if (!src) return '';
    
    // If it's already an absolute URL, use as-is
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    
    // For relative paths, resolve against the API server's storage endpoint
    const basePath = config.apiUrl || 'http://localhost:3001';
    return `${basePath}/storage/${src.replace(/^\/+/, '')}`;
  }, [src]);

  if (imageError) {
    return (
      <span style={{
        display: 'block',
        backgroundColor: 'rgb(249 250 251)',
        border: '2px dashed rgb(209 213 219)',
        borderRadius: '0.5rem',
        padding: '2rem',
        textAlign: 'center',
        marginBottom: '1.25rem',
        color: 'rgb(107 114 128)'
      }}>
        <span style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}>🖼️</span>
        <span style={{ fontSize: '0.875rem', display: 'block' }}>
          Failed to load image: {alt || 'Untitled'}
        </span>
        <span style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7, display: 'block' }}>
          {src}
        </span>
      </span>
    );
  }

  return (
    <span style={{ display: 'block', marginBottom: '1.25rem', textAlign: 'center' }}>
      {!imageLoaded && (
        <span style={{
          display: 'block',
          backgroundColor: 'rgb(249 250 251)',
          border: '1px solid rgb(229 231 235)',
          borderRadius: '0.5rem',
          padding: '2rem',
          color: 'rgb(107 114 128)',
          fontSize: '0.875rem'
        }}>
          Loading image...
        </span>
      )}
      <img
        src={resolvedSrc}
        alt={alt || ''}
        title={title}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        style={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          display: imageLoaded ? 'block' : 'none',
          margin: '0 auto'
        }}
      />
      {title && imageLoaded && (
        <span style={{
          display: 'block',
          fontSize: '0.875rem',
          color: 'rgb(107 114 128)',
          marginTop: '0.5rem',
          fontStyle: 'italic'
        }}>
          {title}
        </span>
      )}
    </span>
  );
};

// Custom components for enhanced rendering
const MarkdownComponents = {
  // Enhanced paragraph rendering
  p: ({ children }) => (
    <p style={{ 
      marginBottom: '1rem', 
      lineHeight: '1.6',
      color: '#2c3e50',
      fontSize: '16px',
      fontWeight: '400'
    }}>
      {children}
    </p>
  ),

  // Enhanced heading rendering with proper spacing
  h1: ({ children }) => (
    <h1 style={{ 
      fontSize: '1.8rem', 
      fontWeight: '600', 
      marginBottom: '1rem', 
      marginTop: '1.5rem',
      color: '#1a202c',
      borderBottom: '2px solid #e2e8f0',
      paddingBottom: '0.5rem',
      fontFamily: '"Crimson Text", "Georgia", serif'
    }}>
      {children}
    </h1>
  ),

  h2: ({ children }) => (
    <h2 style={{ 
      fontSize: '1.5rem', 
      fontWeight: '600', 
      marginBottom: '0.75rem', 
      marginTop: '1.25rem',
      color: '#2d3748',
      fontFamily: '"Crimson Text", "Georgia", serif'
    }}>
      {children}
    </h2>
  ),

  h3: ({ children }) => (
    <h3 style={{ 
      fontSize: '1.25rem', 
      fontWeight: '600', 
      marginBottom: '0.5rem', 
      marginTop: '1rem',
      color: '#2d3748',
      fontFamily: '"Crimson Text", "Georgia", serif'
    }}>
      {children}
    </h3>
  ),

  h4: ({ children }) => (
    <h4 style={{ 
      fontSize: '1.125rem', 
      fontWeight: 'bold', 
      marginBottom: '0.5rem', 
      marginTop: '1rem',
      color: 'rgb(17 24 39)'
    }}>
      {children}
    </h4>
  ),

  h5: ({ children }) => (
    <h5 style={{ 
      fontSize: '1rem', 
      fontWeight: 'bold', 
      marginBottom: '0.5rem', 
      marginTop: '1rem',
      color: 'rgb(17 24 39)'
    }}>
      {children}
    </h5>
  ),

  h6: ({ children }) => (
    <h6 style={{ 
      fontSize: '0.875rem', 
      fontWeight: 'bold', 
      marginBottom: '0.5rem', 
      marginTop: '1rem',
      color: 'rgb(75 85 99)'
    }}>
      {children}
    </h6>
  ),

  // Enhanced list rendering
  ul: ({ children }) => (
    <ul style={{ 
      marginBottom: '1.25rem', 
      paddingLeft: '1.5rem',
      listStyleType: 'disc'
    }}>
      {children}
    </ul>
  ),

  ol: ({ children }) => (
    <ol style={{ 
      marginBottom: '1.25rem', 
      paddingLeft: '1.5rem',
      listStyleType: 'decimal'
    }}>
      {children}
    </ol>
  ),

  li: ({ children }) => (
    <li style={{ 
      marginBottom: '0.5rem',
      lineHeight: '1.6'
    }}>
      {children}
    </li>
  ),

  // Enhanced blockquote rendering
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: '4px solid #a0aec0',
      paddingLeft: '1rem',
      marginLeft: '0',
      marginRight: '0',
      marginBottom: '1rem',
      fontStyle: 'italic',
      color: '#4a5568',
      backgroundColor: '#f7fafc',
      padding: '1rem',
      borderRadius: '6px',
      fontSize: '15px',
      fontFamily: '"Crimson Text", "Georgia", serif'
    }}>
      {children}
    </blockquote>
  ),

  // Enhanced code rendering
  code: ({ inline, children }) => {
    if (inline) {
      return (
        <code style={{
          backgroundColor: '#f1f5f9',
          color: '#475569',
          padding: '0.2rem 0.4rem',
          borderRadius: '4px',
          fontSize: '14px',
          fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
          border: '1px solid #e2e8f0'
        }}>
          {children}
        </code>
      );
    }
    return (
      <pre style={{
        backgroundColor: '#1e293b',
        color: '#f1f5f9',
        padding: '1rem',
        borderRadius: '8px',
        overflow: 'auto',
        marginBottom: '1rem',
        fontSize: '14px',
        fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
        border: '1px solid #334155',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <code>{children}</code>
      </pre>
    );
  },

  // Enhanced link rendering with external link detection
  a: ({ href, children, title }) => {
    const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
    
    return (
      <a
        href={href}
        title={title}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        style={{
          color: 'rgb(59 130 246)',
          textDecoration: 'underline',
          textDecorationColor: 'rgb(147 197 253)',
          textUnderlineOffset: '2px'
        }}
        onMouseEnter={(e) => {
          e.target.style.color = 'rgb(37 99 235)';
        }}
        onMouseLeave={(e) => {
          e.target.style.color = 'rgb(59 130 246)';
        }}
      >
        {children}
        {isExternal && (
          <span style={{ 
            fontSize: '0.75rem', 
            marginLeft: '0.25rem',
            opacity: 0.7
          }}>
            ↗
          </span>
        )}
      </a>
    );
  },

  // Enhanced image rendering with relative path support and error handling
  img: (props) => <MarkdownImage {...props} />,

  // Enhanced table rendering
  table: ({ children }) => (
    <div style={{ 
      overflowX: 'auto', 
      marginBottom: '1.25rem',
      border: '1px solid rgb(229 231 235)',
      borderRadius: '0.5rem'
    }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse'
      }}>
        {children}
      </table>
    </div>
  ),

  th: ({ children }) => (
    <th style={{
      padding: '0.75rem',
      backgroundColor: 'rgb(249 250 251)',
      borderBottom: '1px solid rgb(229 231 235)',
      fontWeight: 'bold',
      textAlign: 'left'
    }}>
      {children}
    </th>
  ),

  td: ({ children }) => (
    <td style={{
      padding: '0.75rem',
      borderBottom: '1px solid rgb(229 231 235)'
    }}>
      {children}
    </td>
  ),

  // Enhanced horizontal rule
  hr: () => (
    <hr style={{
      border: 'none',
      borderTop: '2px solid rgb(229 231 235)',
      margin: '2rem 0'
    }} />
  ),

  // Strong and emphasis
  strong: ({ children }) => (
    <strong style={{ fontWeight: 'bold', color: 'rgb(17 24 39)' }}>
      {children}
    </strong>
  ),

  em: ({ children }) => (
    <em style={{ fontStyle: 'italic', color: 'rgb(55 65 81)' }}>
      {children}
    </em>
  )
};

const StreamingMarkdownRenderer = ({ content, isStreaming }) => {
  const [renderedLines, setRenderedLines] = useState([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  // Process content line by line for streaming effect
  useEffect(() => {
    if (!content) {
      setRenderedLines([]);
      setCurrentLineIndex(0);
      return;
    }

    const lines = content.split('\n');
    
    if (isStreaming) {
      // For streaming, render line by line with a slight delay
      const renderNextLine = () => {
        setCurrentLineIndex(prevIndex => {
          const nextIndex = Math.min(prevIndex + 1, lines.length);
          setRenderedLines(lines.slice(0, nextIndex));
          return nextIndex;
        });
      };

      if (currentLineIndex < lines.length) {
        const timer = setTimeout(renderNextLine, 50); // 50ms delay between lines
        return () => clearTimeout(timer);
      }
    } else {
      // For non-streaming, render all content immediately
      setRenderedLines(lines);
      setCurrentLineIndex(lines.length);
    }
  }, [content, isStreaming, currentLineIndex]);

  // Pre-process content to handle tables manually since we removed remark-gfm
  const processedContent = useMemo(() => {
    const markdownContent = renderedLines.join('\n');
    
    // Simple table detection and conversion
    const lines = markdownContent.split('\n');
    const processedLines = [];
    let inTable = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      
      // Detect table header (line with | followed by line with |---|)
      if (line.includes('|') && nextLine && nextLine.match(/^\s*\|[\s\-\|:]+\|\s*$/)) {
        inTable = true;
        processedLines.push(line);
        processedLines.push(nextLine);
        i++; // Skip the separator line in next iteration
      } else if (inTable && line.includes('|')) {
        processedLines.push(line);
      } else if (inTable && !line.includes('|')) {
        inTable = false;
        processedLines.push(line);
      } else {
        processedLines.push(line);
      }
    }
    
    return processedLines.join('\n');
  }, [renderedLines]);

  return (
    <div className="streaming-markdown-content" style={{
      fontFamily: '"Crimson Text", "Georgia", "Times New Roman", serif',
      fontSize: '16px',
      lineHeight: '1.6',
      color: '#2c3e50',
      backgroundColor: '#fefefe',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      maxWidth: '100%',
      margin: '0 auto'
    }}>
      <ReactMarkdown
        components={MarkdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
      
      {/* Streaming cursor indicator */}
      {isStreaming && currentLineIndex < content.split('\n').length && (
        <span style={{
          display: 'inline-block',
          width: '2px',
          height: '1.2em',
          backgroundColor: 'rgb(59 130 246)',
          animation: 'blink 1s infinite',
          marginLeft: '2px'
        }} />
      )}
      
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default StreamingMarkdownRenderer;
