
import React, { useState, useEffect } from 'react';
import { GameConfig, Theme } from '../types';
import { generateStudyContent } from '../services/genai';
import { GoogleDriveService } from '../services/googleDrive';
import { t } from '../utils/translations';
import MermaidDiagram from './MermaidDiagram';
import MarkdownRenderer from './MarkdownRenderer';
import FlashcardGame from './FlashcardGame';
import PodcastPlayer from './PodcastPlayer';

interface StudyHubProps {
  config: GameConfig;
  onExit: () => void;
  systemLanguage: string;
  theme: Theme;
}

const StudyHub: React.FC<StudyHubProps> = ({ config, onExit, systemLanguage, theme }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'outline' | 'mindmap' | 'flashcards' | 'podcast' | null>(null);
  const [summary, setSummary] = useState('');
  const [outline, setOutline] = useState('');
  const [mindMap, setMindMap] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadContent = async (type: 'summary' | 'outline' | 'mindmap') => {
      setLoading(true);
      const result = await generateStudyContent(config.studyMaterial, type, config.language);
      if (type === 'summary') setSummary(result);
      if (type === 'outline') setOutline(result);
      if (type === 'mindmap') setMindMap(result);
      setLoading(false);
  };

  const handleSaveToDrive = async (type: 'summary' | 'outline' | 'mindmap') => {
      let content = "";
      let ext = "txt";
      let mime = "text/plain";

      if (type === 'summary') { content = summary; ext="md"; }
      if (type === 'outline') { content = outline; ext="md"; }
      if (type === 'mindmap') { content = mindMap; ext="mermaid"; }

      if (!content) return;

      setSaving(true);
      try {
          const filename = `StudyAi_${type}_${Date.now()}.${ext}`;
          await GoogleDriveService.uploadFile(content, filename, mime);
          alert(t('saved', systemLanguage));
      } catch (e) {
          console.error(e);
          alert(t('driveError', systemLanguage) + ". " + t('driveLogin', systemLanguage));
      } finally {
          setSaving(false);
      }
  };

  useEffect(() => {
      if (activeTab === 'summary' && !summary && !loading) loadContent('summary');
      if (activeTab === 'outline' && !outline && !loading) loadContent('outline');
      if (activeTab === 'mindmap' && !mindMap && !loading) loadContent('mindmap');
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const renderContent = () => {
      if (loading) {
          return (
              <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-fadeIn">
                  <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${theme.accentColor.replace('text-', 'border-')}`}></div>
                  <p className={theme.textSecondary}>
                      {activeTab === 'summary' && t('summaryPrompt', systemLanguage)}
                      {activeTab === 'outline' && t('outlinePrompt', systemLanguage)}
                      {activeTab === 'mindmap' && t('mindMapPrompt', systemLanguage)}
                  </p>
              </div>
          )
      }

      if (activeTab === 'flashcards') {
          return <FlashcardGame studyMaterial={config.studyMaterial} language={config.language} systemLanguage={systemLanguage} theme={theme} />
      }

      if (activeTab === 'podcast') {
          return <PodcastPlayer studyMaterial={config.studyMaterial} language={config.language} systemLanguage={systemLanguage} theme={theme} />
      }

      if (activeTab === 'mindmap') {
          return (
              <div className="animate-fadeIn w-full h-full">
                  <MermaidDiagram chart={mindMap} />
              </div>
          )
      }

      const textContent = activeTab === 'summary' ? summary : outline;
      return (
        <div className={`animate-fadeIn p-2`}>
            <MarkdownRenderer content={textContent} theme={theme} />
        </div>
      );
  };

  // Landing Menu View
  if (!activeTab) {
      return (
        <div className="w-full max-w-6xl mx-auto p-4 flex flex-col items-center justify-center min-h-[80vh] animate-fadeIn">
            <div className="w-full flex justify-between items-center mb-8">
                <h2 className={`text-4xl font-bold ${theme.textMain}`}>{t('studyHubTitle', systemLanguage)}</h2>
                <button onClick={onExit} className={`${theme.secondaryBtn} px-4 py-2 rounded-lg text-sm font-bold`}>
                    {t('backToSetup', systemLanguage)}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                <button 
                    onClick={() => setActiveTab('summary')}
                    className={`group p-6 rounded-2xl border-2 text-left transition-all hover:-translate-y-1 ${theme.cardBg} ${theme.cardBorder} hover:border-blue-400`}
                >
                    <div className="text-3xl mb-3">📝</div>
                    <h3 className={`text-xl font-bold mb-1 ${theme.textMain}`}>{t('tabSummary', systemLanguage)}</h3>
                    <p className={`text-sm ${theme.textSecondary}`}>Key concepts overview.</p>
                </button>

                <button 
                    onClick={() => setActiveTab('outline')}
                    className={`group p-6 rounded-2xl border-2 text-left transition-all hover:-translate-y-1 ${theme.cardBg} ${theme.cardBorder} hover:border-purple-400`}
                >
                    <div className="text-3xl mb-3">📑</div>
                    <h3 className={`text-xl font-bold mb-1 ${theme.textMain}`}>{t('tabOutline', systemLanguage)}</h3>
                    <p className={`text-sm ${theme.textSecondary}`}>Structure hierarchy.</p>
                </button>

                <button 
                    onClick={() => setActiveTab('mindmap')}
                    className={`group p-6 rounded-2xl border-2 text-left transition-all hover:-translate-y-1 ${theme.cardBg} ${theme.cardBorder} hover:border-emerald-400`}
                >
                    <div className="text-3xl mb-3">🧠</div>
                    <h3 className={`text-xl font-bold mb-1 ${theme.textMain}`}>{t('tabMindMap', systemLanguage)}</h3>
                    <p className={`text-sm ${theme.textSecondary}`}>Visual connections.</p>
                </button>

                <button 
                    onClick={() => setActiveTab('flashcards')}
                    className={`group p-6 rounded-2xl border-2 text-left transition-all hover:-translate-y-1 ${theme.cardBg} ${theme.cardBorder} hover:border-orange-400`}
                >
                    <div className="text-3xl mb-3">🎴</div>
                    <h3 className={`text-xl font-bold mb-1 ${theme.textMain}`}>{t('tabFlashcards', systemLanguage)}</h3>
                    <p className={`text-sm ${theme.textSecondary}`}>Active recall practice.</p>
                </button>

                <button 
                    onClick={() => setActiveTab('podcast')}
                    className={`group p-6 rounded-2xl border-2 text-left transition-all hover:-translate-y-1 ${theme.cardBg} ${theme.cardBorder} hover:border-pink-400`}
                >
                    <div className="text-3xl mb-3">🎧</div>
                    <h3 className={`text-xl font-bold mb-1 ${theme.textMain}`}>{t('tabPodcast', systemLanguage)}</h3>
                    <p className={`text-sm ${theme.textSecondary}`}>Audio learning session.</p>
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 flex flex-col h-[90vh]">
      <div className="flex justify-between items-center mb-6">
          <h2 className={`text-3xl font-bold ${theme.textMain}`}>{t('studyHubTitle', systemLanguage)}</h2>
          <button onClick={onExit} className={`${theme.secondaryBtn} px-4 py-2 rounded-lg text-sm font-bold`}>
              {t('backToSetup', systemLanguage)}
          </button>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${theme.cardBorder} mb-6 overflow-x-auto`}>
          {(['summary', 'outline', 'mindmap', 'flashcards', 'podcast'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-bold text-sm uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab 
                    ? `${theme.accentColor.replace('text-', 'border-')} ${theme.textMain}` 
                    : `border-transparent ${theme.textSecondary} hover:text-white`
                }`}
              >
                  {t(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`, systemLanguage)}
              </button>
          ))}
      </div>

      {/* Content Area */}
      <div className={`flex-grow overflow-hidden rounded-xl shadow-2xl border flex flex-col ${theme.cardBg} ${theme.cardBorder}`}>
          <div className="flex-grow overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {renderContent()}
          </div>
          
          {['summary', 'outline', 'mindmap'].includes(activeTab as string) && (
            <div className={`p-4 border-t ${theme.cardBorder} flex justify-end space-x-4 bg-opacity-50 bg-black`}>
                <button
                    onClick={() => handleSaveToDrive(activeTab as any)}
                    disabled={saving}
                    className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center ${theme.secondaryBtn}`}
                >
                     <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                     {saving ? t('saving', systemLanguage) : t('saveToDrive', systemLanguage)}
                </button>

                <button 
                    onClick={() => loadContent(activeTab as any)}
                    disabled={loading}
                    className={`px-6 py-2 rounded-lg font-bold text-sm ${theme.primaryBtn} disabled:opacity-50`}
                >
                    {loading ? t('generating', systemLanguage) : t('regenerate', systemLanguage)}
                </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default StudyHub;
