
import React from 'react';
import { Theme } from '../types';

interface MarkdownRendererProps {
  content: string;
  theme: Theme;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, theme }) => {
  // Helper to strip markdown symbols (**text**) but keep the content
  // and return styled elements
  const renderStyledText = (text: string, isBold = false) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className={`font-bold ${theme.accentColor}`}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={index} className={isBold ? 'font-bold' : ''}>{part}</span>;
    });
  };

  const renderLines = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        elements.push(<div key={`spacer-${i}`} className="h-3" />); // Subtle spacer
        continue;
      }

      // Headers (Strip # and style)
      if (line.startsWith('### ')) {
        const text = line.replace(/^###\s+/, '');
        elements.push(
          <h3 key={i} className={`text-lg font-bold mt-4 mb-2 ${theme.textMain} flex items-center`}>
            <span className={`inline-block w-1.5 h-6 mr-2 rounded-full bg-gradient-to-b from-transparent via-${theme.primaryBtn.split('-')[1]}-400 to-transparent opacity-50`}></span>
            {renderStyledText(text)}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        const text = line.replace(/^##\s+/, '');
        elements.push(
          <h2 key={i} className={`text-xl font-bold mt-6 mb-3 pb-1 border-b ${theme.cardBorder} ${theme.textMain}`}>
            {renderStyledText(text)}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        const text = line.replace(/^#\s+/, '');
        elements.push(
          <h1 key={i} className={`text-3xl font-extrabold mt-2 mb-6 tracking-tight ${theme.textMain}`}>
            {renderStyledText(text)}
          </h1>
        );
      } 
      // List Items (Strip - or * and style with icon)
      else if (line.match(/^[-*]\s/)) {
        const text = line.replace(/^[-*]\s+/, '');
        elements.push(
          <div key={i} className="flex items-start space-x-3 mb-2 ml-1">
             <div className={`mt-1.5 min-w-[6px] h-[6px] rounded-full ${theme.accentColor.replace('text-', 'bg-')}`}></div>
            <p className={`leading-relaxed ${theme.textSecondary}`}>
              {renderStyledText(text)}
            </p>
          </div>
        );
      } 
      // Regular Paragraphs
      else {
        elements.push(
          <p key={i} className={`mb-3 leading-relaxed ${theme.textMain} text-base opacity-90`}>
            {renderStyledText(line)}
          </p>
        );
      }
    }
    return elements;
  };

  return (
      <div className={`p-8 rounded-xl ${theme.cardBg} shadow-inner bg-opacity-50 backdrop-blur-sm border ${theme.cardBorder}`}>
          <div className="space-y-1 font-sans">
            {renderLines()}
          </div>
      </div>
  );
};

export default MarkdownRenderer;
