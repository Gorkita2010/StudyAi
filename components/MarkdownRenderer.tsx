
import React from 'react';
import { Theme } from '../types';

interface MarkdownRendererProps {
  content: string;
  theme: Theme;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, theme }) => {
  // Helper to parse **bold** text within a string
  const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className={`font-bold ${theme.accentColor}`}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const renderLines = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        elements.push(<div key={i} className="h-4" />); // Spacer
        continue;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className={`text-xl font-bold mt-4 mb-2 ${theme.textMain}`}>
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className={`text-2xl font-bold mt-6 mb-3 border-b ${theme.cardBorder} pb-2 ${theme.textMain}`}>
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className={`text-3xl font-extrabold mt-6 mb-4 ${theme.textMain}`}>
            {line.replace('# ', '')}
          </h1>
        );
      } 
      // List Items
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        const text = line.substring(2);
        elements.push(
          <div key={i} className="flex items-start space-x-3 mb-2 ml-2">
            <div className={`mt-1.5 min-w-[6px] h-[6px] rounded-full ${theme.primaryBtn.split(' ')[0]}`}></div>
            <p className={`leading-relaxed ${theme.textSecondary}`}>
              {parseInlineStyles(text)}
            </p>
          </div>
        );
      } 
      // Regular Paragraphs
      else {
        elements.push(
          <p key={i} className={`mb-2 leading-relaxed ${theme.textMain}`}>
            {parseInlineStyles(line)}
          </p>
        );
      }
    }
    return elements;
  };

  return <div className="space-y-1">{renderLines()}</div>;
};

export default MarkdownRenderer;
